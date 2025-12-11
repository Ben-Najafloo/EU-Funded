# __init__.py
from flask import Flask
from clerk_backend_api import Clerk
from .config import Config
from dotenv import load_dotenv
import os

clerk = None


def create_app():
    global clerk

    load_dotenv()
    clerk = Clerk(os.getenv('CLERK_SECRET_KEY'))

    app = Flask(__name__)
    app.config.from_object(Config)

    from app.routes.projects.routes import projects_bp
    from app.routes.organizations.routes import organizations_bp
    # from app.routes.organizations import organizations_bp
    from app.routes.stats import stats_bp
    from app.routes.admin import admin_bp
    from app.routes.users import users_bp

    app.register_blueprint(organizations_bp, url_prefix='/api/organizations')
    app.register_blueprint(projects_bp, url_prefix="/api/projects")
    # app.register_blueprint(organizations_bp, url_prefix="/api/organizations")
    app.register_blueprint(stats_bp, url_prefix="/api/stats")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(users_bp, url_prefix="/api/users")

    return app
