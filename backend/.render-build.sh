#!/usr/bin/env bash
# Custom build steps for Render deployment
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt
