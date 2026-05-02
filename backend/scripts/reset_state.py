import os
import sqlite3


def reset_state():
    db_path = "backend/finance.db"
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Deleting reconciliation links...")
        cursor.execute("DELETE FROM reconciliation_links")
        links_deleted = cursor.rowcount
        print(f"Deleted {links_deleted} links.")

        print("Resetting transactions status to UNMATCHED and clearing notes...")
        cursor.execute("UPDATE transactions SET status = 'UNMATCHED', notes = NULL")
        txns_updated = cursor.rowcount
        print(f"Updated {txns_updated} transactions.")

        print("Resetting splitwise expenses status to UNMATCHED...")
        cursor.execute("UPDATE splitwise_expenses SET status = 'UNMATCHED'")
        expenses_updated = cursor.rowcount
        print(f"Updated {expenses_updated} splitwise expenses.")

        conn.commit()
        print("Reset complete. Changes committed.")

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    reset_state()
