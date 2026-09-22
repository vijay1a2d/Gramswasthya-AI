from utils.database import SessionLocal
from routes.patients import list_patients

def run():
    db = SessionLocal()
    try:
        res = list_patients(skip=0, limit=50, db=db)
        print("Success!", len(res.get("patients", [])))
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run()
