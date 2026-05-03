import os
import sqlite3


def clean_db():
    db_path = "backend/finance.db"
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Disable foreign keys temporarily to avoid deletion order issues
        cursor.execute("PRAGMA foreign_keys = OFF")

        tables_to_clear = [
            "reconciliation_links",
            "transactions",
            "import_batches",
            "splitwise_expenses",
            "accounts",
        ]

        for table in tables_to_clear:
            print(f"Clearing table: {table}...")
            cursor.execute(f"DELETE FROM {table}")
            count = cursor.rowcount
            print(f"Deleted {count} rows from {table}.")

        # Re-enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON")

        conn.commit()
        print("Cleanup complete. finance.db is now fresh.")

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    clean_db()
