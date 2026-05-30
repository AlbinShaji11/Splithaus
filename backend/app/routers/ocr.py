from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import ReceiptScanResponse
from app.services import parser

router = APIRouter(prefix="/api", tags=["ocr"])

ALLOWED_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/html",
    "application/xhtml+xml",
}
MAX_BYTES = 10 * 1024 * 1024  # 10MB


def _is_html(file: UploadFile) -> bool:
    """True when the upload is an HTML file (by content-type or extension)."""
    ct = (file.content_type or '').split(';')[0].strip().lower()
    fn = (file.filename or '').lower()
    return ct in {'text/html', 'application/xhtml+xml'} or fn.endswith('.html')


@router.post("/scan-receipt", response_model=ReceiptScanResponse)
async def scan_receipt(file: UploadFile = File(...)):
    # Normalise content-type (strip charset suffix etc.)
    content_type = (file.content_type or '').split(';')[0].strip()

    if content_type not in ALLOWED_TYPES and not _is_html(file):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Allowed: jpeg, png, pdf, webp, html"
            ),
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=422,
            detail="File exceeds 10MB limit"
        )

    try:
        if content_type == "application/pdf":
            result = parser.parse_pdf(file_bytes)
        elif _is_html(file):
            result = parser.parse_html(file_bytes)
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
