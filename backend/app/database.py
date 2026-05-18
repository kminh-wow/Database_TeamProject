import os
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, SessionExpired, AuthError
from dotenv import load_dotenv

load_dotenv()

_driver = None


def _create_driver():
    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")
    return GraphDatabase.driver(uri, auth=(username, password))


def get_driver():
    global _driver
    if _driver is None:
        _driver = _create_driver()
    return _driver


def close_driver():
    global _driver
    if _driver:
        _driver.close()
        _driver = None


def get_session():
    global _driver
    database = os.getenv("NEO4J_DATABASE")
    try:
        return get_driver().session(database=database)
    except (ServiceUnavailable, SessionExpired, AuthError, Exception):
        _driver = None
        _driver = _create_driver()
        return _driver.session(database=database)
