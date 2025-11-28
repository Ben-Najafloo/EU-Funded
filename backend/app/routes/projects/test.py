
# @projects_bp.route("/search", methods=["GET"])
# def search_projects():
#     """Advanced search with text search, filters, and phrase boosting."""
#     q = request.args.get("q", "").strip()
#     page = int(request.args.get("page", 1))
#     per_page = int(request.args.get("per_page", 10))
#     skip = (page - 1) * per_page

#     pipeline = []

#     # --- TEXT SEARCH WITH CUSTOM PHRASE BOOST ---
#     if q:
#         # Step 1: Text search
#         pipeline.append({
#             "$match": {
#                 "$text": {"$search": q}
#             }
#         })

#         # Step 2: Calculate base text score
#         pipeline.append({
#             "$addFields": {
#                 "textScore": {"$meta": "textScore"}
#             }
#         })

#         # Step 3: Add phrase boost
#         escaped_q = re.escape(q.lower())
#         pipeline.append({
#             "$addFields": {
#                 "titlePhraseBoost": {
#                     "$cond": {
#                         "if": {
#                             "$regexMatch": {
#                                 "input": {"$toLower": "$title"},
#                                 "regex": escaped_q
#                             }
#                         },
#                         "then": 100,
#                         "else": 0
#                     }
#                 },
#                 "objectivePhraseBoost": {
#                     "$cond": {
#                         "if": {
#                             "$regexMatch": {
#                                 "input": {"$toLower": "$objective"},
#                                 "regex": escaped_q
#                             }
#                         },
#                         "then": 50,
#                         "else": 0
#                     }
#                 },
#                 "keywordsPhraseBoost": {
#                     "$cond": {
#                         "if": {
#                             "$regexMatch": {
#                                 "input": {"$toLower": {"$ifNull": ["$keywords", ""]}},
#                                 "regex": escaped_q
#                             }
#                         },
#                         "then": 75,
#                         "else": 0
#                     }
#                 }
#             }
#         })

#         # Step 4: Calculate final score
#         pipeline.append({
#             "$addFields": {
#                 "finalScore": {
#                     "$add": [
#                         "$textScore",
#                         "$titlePhraseBoost",
#                         "$objectivePhraseBoost",
#                         "$keywordsPhraseBoost"
#                     ]
#                 }
#             }
#         })

#     # --- Other filters ---
#     filters = {}

#     keywords_param = request.args.get("keywords")
#     if keywords_param:
#         keywords = [k.strip() for k in keywords_param.split(",") if k.strip()]
#         if keywords:
#             filters["$or"] = [
#                 {"keywords": {
#                     "$regex": rf"\b{re.escape(k)}\b", "$options": "i"}}
#                 for k in keywords
#             ]

#     status = request.args.get("status")
#     if status:
#         filters["status"] = status

#     acronym = request.args.get("acronym")
#     if acronym:
#         filters["acronym"] = {
#             "$regex": rf"^{re.escape(acronym)}$", "$options": "i"}

#     title = request.args.get("title")
#     if title:
#         filters["title"] = {"$regex": re.escape(title), "$options": "i"}

#     programme = request.args.get("programme")
#     if programme:
#         filters["frameworkProgramme"] = programme

#     topics = request.args.get("topics")
#     if topics:
#         filters["topics"] = topics

#     start_date = request.args.get("start_date")
#     if start_date:
#         filters["startDate"] = {"$gte": start_date}

#     end_date = request.args.get("end_date")
#     if end_date:
#         filters.setdefault("endDate", {})
#         filters["endDate"]["$lte"] = end_date

#     min_contribution = request.args.get("min_contribution")
#     max_contribution = request.args.get("max_contribution")
#     if min_contribution or max_contribution:
#         try:
#             filters["ecMaxContribution"] = {}
#             if min_contribution:
#                 filters["ecMaxContribution"]["$gte"] = float(min_contribution)
#             if max_contribution:
#                 filters["ecMaxContribution"]["$lte"] = float(max_contribution)
#         except ValueError:
#             pass

#     min_total_cost = request.args.get("min_total_cost")
#     max_total_cost = request.args.get("max_total_cost")
#     if min_total_cost or max_total_cost:
#         try:
#             filters["totalCost"] = {}
#             if min_total_cost:
#                 filters["totalCost"]["$gte"] = float(min_total_cost)
#             if max_total_cost:
#                 filters["totalCost"]["$lte"] = float(max_total_cost)
#         except ValueError:
#             pass

#     if filters:
#         pipeline.append({"$match": filters})

#     # Sort by final score (if text search) or by date
#     if q:
#         pipeline.append({"$sort": {"finalScore": -1, "startDate": -1}})
#     else:
#         pipeline.append({"$sort": {"startDate": -1}})

#     # Get total count before pagination
#     count_pipeline = pipeline.copy()
#     count_pipeline.append({"$count": "total"})
#     count_result = list(projects_collection.aggregate(count_pipeline))
#     total_count = count_result[0]["total"] if count_result else 0

#     # Add pagination
#     pipeline.append({"$skip": skip})
#     pipeline.append({"$limit": per_page})

#     # Execute aggregation
#     cursor = projects_collection.aggregate(pipeline)
#     results = []

#     for doc in cursor:
#         doc = serialize_doc(doc)
#         project_id = doc["id"]

#         # Fetch related organizations
#         organizations = []
#         for org in organizations_collection.find({"projectID": project_id}):
#             org_data = serialize_doc(org)
#             org_data["project_count"] = organizations_collection.count_documents({
#                 "organisationID": org_data["organisationID"]
#             })
#             org_data["coordinator_count"] = organizations_collection.count_documents({
#                 "organisationID": org_data["organisationID"],
#                 "role": {"$regex": "^coordinator$", "$options": "i"}
#             })
#             organizations.append(org_data)

#         countries = request.args.get("countries")
#         if countries:
#             allowed_countries = set(countries.split(","))
#             org_countries = {org.get("country") for org in organizations}
#             if org_countries.isdisjoint(allowed_countries):
#                 continue

#         coordinator = next(
#             (org for org in organizations if org.get(
#                 "role", "").lower() == "coordinator"),
#             None
#         )
#         organizations = [org for org in organizations if org.get(
#             "role", "").lower() != "coordinator"]

#         doc["extracted_keywords"] = extract_project_keywords(doc)[:10]

#         if request.args.get('include_summary') == 'true' and doc.get("objective"):
#             doc["objective_summary"] = summarize_objective(doc["objective"])

#         doc["coordinator"] = coordinator
#         doc["organizations"] = organizations

#         # Include finalScore in the response
#         if q and "finalScore" in doc:
#             doc["relevance_score"] = round(doc["finalScore"], 2)

#         # Clean up intermediate scoring fields
#         for field in ["textScore", "titlePhraseBoost", "objectivePhraseBoost", "keywordsPhraseBoost"]:
#             doc.pop(field, None)

#         results.append(doc)

#     return jsonify({
#         "projects": results,
#         "total": total_count,
#         "page": page,
#         "pages": (total_count + per_page - 1) // per_page,
#         "per_page": per_page
#     })


# # ============================================================================
# # DETAIL ENDPOINTS
# # ============================================================================


# export const SearchProjects = async (query, page = 1, perPage = 10, filters = {}) => {
#     const params = {
#         q: query,
#         page,
#         per_page: perPage
#     };

#     Object.entries(filters).forEach(([key, value]) => {
#         if (Array.isArray(value) && value.length > 0) {
#             params[key] = value.join(',');
#         } else if (value !== undefined && value !== null && value !== '') {
#             params[key] = value;
#         }
#     });

#     const res = await client.get('/projects/search', { params });
#     return res.data;
# };
