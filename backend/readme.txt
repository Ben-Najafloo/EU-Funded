.venv\Scripts\activate

pip install spacy
python -m spacy download en_core_web_sm
pip install -r requirements.txt


uvicorn app.main:app --reload --port 8000