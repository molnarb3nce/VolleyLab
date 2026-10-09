#!/bin/sh
set -e
export API_URL="${API_URL:-${VITE_API_URL:-}}"
if [ -z "$API_URL" ]; then
  echo "ERROR: Set API_URL on this service to the public backend URL (https://...)."
  exit 1
fi
node -e "
require('fs').writeFileSync(
  '/app/dist/runtime-config.js',
  'window.__VOLLEYLAB_API_URL__=' + JSON.stringify(process.env.API_URL) + ';\n',
);
"
exec serve -s dist -l "tcp://0.0.0.0:${PORT:-8080}"
