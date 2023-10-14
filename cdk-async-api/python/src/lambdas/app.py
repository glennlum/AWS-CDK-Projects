import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def main(event, context):
    logger.info(event)
    for record in event["Records"]:
        message = record["body"]
        logger.info(message)
