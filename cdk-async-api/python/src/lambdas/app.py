import json


def main(event, context):
    print('Receiving message from SQS')
    for record in event["Records"]:
        message = record["body"]
        print(message)
