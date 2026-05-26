import os
import time

import boto3


def _client(service: str):
    return boto3.client(service, region_name=os.environ.get("AWS_REGION", "ap-southeast-2"))


def scan_receipt(file_bytes: bytes, content_type: str) -> dict:
    if content_type == "application/pdf":
        return _analyze_pdf(file_bytes)
    return _analyze_image(file_bytes)


def _analyze_image(file_bytes: bytes) -> dict:
    return _client("textract").analyze_expense(Document={"Bytes": file_bytes})


def _analyze_pdf(file_bytes: bytes) -> dict:
    bucket = os.environ.get("TEXTRACT_S3_BUCKET", "splithaus-receipts")
    s3 = _client("s3")
    textract = _client("textract")
    key = f"uploads/{int(time.time())}.pdf"

    s3.put_object(Bucket=bucket, Key=key, Body=file_bytes)
    try:
        job = textract.start_expense_analysis(
            DocumentLocation={"S3Object": {"Bucket": bucket, "Name": key}}
        )
        job_id = job["JobId"]
        while True:
            result = textract.get_expense_analysis(JobId=job_id)
            status = result["JobStatus"]
            if status == "SUCCEEDED":
                return result
            if status == "FAILED":
                raise RuntimeError(f"Textract job failed: {result.get('StatusMessage', 'unknown')}")
            time.sleep(2)
    finally:
        s3.delete_object(Bucket=bucket, Key=key)
