from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import ReceiptScanResponse
from app.services import parser
from app.services import textract as textract_service

router = APIRouter(tags=["ocr"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"}
MAX_BYTES = 10 * 1024 * 1024


@router.post("/scan-receipt", response_model=ReceiptScanResponse)
async def scan_receipt(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Allowed: jpeg, png, pdf, webp, heic"
            ),
        )
    file_bytes = await file.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(status_code=422, detail="File exceeds 10 MB limit")
    try:
        textract_data = textract_service.scan_receipt(file_bytes, file.content_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Textract error: {exc}") from exc
    return parser.parse_textract_response(textract_data)
