from fastapi import APIRouter, File, HTTPException, UploadFile
from app.models.schemas import ReceiptScanResponse
from app.services import parser

router = APIRouter(tags=["ocr"])

ALLOWED_TYPES = {
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/webp",
    "application/pdf"
}
MAX_BYTES = 10 * 1024 * 1024  # 10MB


@router.post("/scan-receipt", response_model=ReceiptScanResponse)
async def scan_receipt(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Allowed: jpeg, png, pdf, webp"
            ),
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=422,
            detail="File exceeds 10MB limit"
        )

    try:
        if file.content_type == "application/pdf":
            result = parser.parse_pdf(file_bytes)
        else:
            result = parser.parse_image(file_bytes, file.filename or "upload.jpg")
        return result

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process receipt: {str(exc)}"
        ) from exc
