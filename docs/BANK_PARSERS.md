# Bank Statement Parsers

Neme supports multiple bank statement formats, ranging from simple CSVs to professional SWIFT MT940 standards. All parsers inherit from a common base class and leverage a centralized cleaning utility to ensure consistent data quality.

## Supported Banks & Formats

| Bank | Format | Notes |
| :--- | :--- | :--- |
| **HSBC** | CSV | Standard personal account format. |
| **Axis Bank** | Excel (.xlsx) | Credit Card statements. Handles multi-line headers and city-suffix stripping. |
| **ICICI Bank** | Excel (.xls) | Optimized for Current Account exports. |
| **Kotak Bank** | MT940 (.txt) | Professional SWIFT standard. Highly reliable for high-volume accounts. |

## The Parsing Pipeline

1.  **Ingestion:** The file is received via `POST /api/import` as raw bytes.
2.  **Dispatch:** Based on the `source_type`, the appropriate parser is instantiated.
3.  **Extraction:**
    *   **Excel/CSV:** Parsed using `pandas`. We target specific header rows and map columns to our internal schema.
    *   **MT940:** Parsed using the `mt940` library. We extract the SWIFT Tag 4 block to isolate transaction data from bank headers.
4.  **Counterparty Cleaning:** This is the most critical step. Every raw description is passed through `clean_counterparty` in `utils.py`.
5.  **Normalization:**
    *   Dates are converted to ISO 8601 (`YYYY-MM-DD`).
    *   Amounts are converted to **Minor Units** (integers) to prevent floating-point errors (e.g., ₹12.50 becomes `1250`).
    *   Currency is defaulted to `INR` unless specified in the file.

## Counterparty Cleaning Heuristics

The `clean_counterparty` utility uses advanced regex and string manipulation to transform cryptic bank strings into human-readable merchant names:

-   **UPI Stripping:** Transforms `UPI/SWIGGY/603850523738/Sent...` → `SWIGGY`.
-   **NEFT Normalization:** Strips IFSC codes and reference numbers from NEFT transfers.
-   **Gateway Removal:** Automatically removes prefixes like `PYU*` (PayU), `RZP*` (Razorpay), and `PADDLE.NET*`.
-   **Internal Transfer Detection:** Maps internal bank movements like `Sweep Trf` and `FD PREMAT PROCEEDS` to standardized names like `Sweep Transfer` and `FD Proceeds`.
-   **Corporate Noise:** Truncates legal suffixes like `INDIA PRIVATE LIMITED`, `PVT LTD`, and `SERVICES PRIV`.
-   **Payment App Noise:** Removes phrases like "Sent using Payt", "Pay to BharatPe", and "Payment from PhonePe".

## Adding a New Parser

To add a new bank:
1.  Create `backend/app/parsers/<bank_name>.py`.
2.  Inherit from `BankParser` and implement the `parse` method.
3.  Add common cleaning patterns to `backend/app/parsers/utils.py`.
4.  Register the bank in `backend/app/main.py` and `frontend/src/UploadModal.tsx`.
