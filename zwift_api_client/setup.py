from setuptools import setup, find_packages

setup(
    name="zwift_api_client",
    version="0.1.0",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "requests",
        "beautifulsoup4",
        "lxml",
        "pyyaml",
        "fastapi",
        "uvicorn",
        "python-multipart",
        "python-dotenv",
    ],
)
