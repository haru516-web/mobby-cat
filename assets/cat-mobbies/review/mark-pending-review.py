"""Record the combined review findings without modifying image pixels."""
import json
from pathlib import Path
review=Path('assets/cat-mobbies/review')
state=json.loads((review/'resume-state.json').read_text(encoding='utf-8'))
for group in state['revisionPending']:
    for id in group['revise']:
        path=review/f'accepted-{id}.json'
        record=json.loads(path.read_text(encoding='utf-8'))
        record['combinedSimilarityReview']={'status':'revision-pending','group':group['group'],'reason':group['reason']}
        path.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Marked nine saved B concepts for further similarity revision.')
