from setuptools import setup, find_packages

subpackages = find_packages()
package_list = ["zwift_api_client"] + [f"zwift_api_client.{pkg}" for pkg in subpackages]
setup(
    name="zwift_api_client",
    version="0.1.0",
    packages=package_list,
    package_dir={"zwift_api_client": "."},
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
