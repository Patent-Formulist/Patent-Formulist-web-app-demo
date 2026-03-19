rm -r -force dist
npm cache clean --force
Copy-Item -Path "dist/*" -Destination "../AI-assistant-for-patents-deployment-orchestrator/nginx/html/" -Recurse -Force