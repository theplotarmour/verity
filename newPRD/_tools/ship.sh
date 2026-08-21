#!/bin/sh
# Author-loop helper: normalise the model, regenerate, commit with the supplied message.
# Not a generator. Writes nothing into the numbered folders itself.
set -e
cd "$(dirname "$0")/.."
python3 _tools/normalize_model.py > /dev/null
python3 _tools/generate_v2.py | python3 -c "import json,sys;d=json.load(sys.stdin);print(' '.join(f'{k}={d[k]}' for k in ('capabilities','entities','actions','transitions','events','generated_tests','unresolved_gaps','cross_capability_dependencies','contradictions_and_open_decisions')))"
git add -A
git -c user.name='Verity PRD' -c user.email='n.aggarwal-4@sms.ed.ac.uk' commit -q -F - <<MSG
$1
MSG
