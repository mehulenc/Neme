from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BankParser(ABC):

    @abstractmethod
    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        Parses the raw file content into a list of normalized transaction dictionaries.
        Each dictionary must contain:
        - transaction_date: datetime.date
        - amount_minor_units: int (negative for debits, positive for credits)
        - currency_code: str
        - counterparty: str
        - raw_description: str
        - raw_row_data: dict
        """
        pass
