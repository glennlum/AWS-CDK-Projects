import os
import json


def main(event, context):
    NAME = os.getenv('NAME')
    AGE = os.getenv('AGE')
    print('request: {}'.format(json.dumps(event)))
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/plain'
        },
        'body': f'Hello CDK! {NAME}, {AGE}'
    }
