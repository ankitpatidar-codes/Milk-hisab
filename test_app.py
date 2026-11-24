import unittest
from datetime import date
from app import create_app
from models import db, User, MilkEntry, Payment, Settings


class MilkHisabTestCase(unittest.TestCase):
    def setUp(self):
        # Configure app for testing with an in-memory SQLite database
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['SECRET_KEY'] = 'test-secret'
        self.client = self.app.test_client()

        with self.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_setup_and_login(self):
        # Test setup
        res = self.client.post('/setup', data={
            'username': 'rahul',
            'password': 'password123',
            'confirm_password': 'password123'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        with self.app.app_context():
            user = User.query.filter_by(username='rahul').first()
            self.assertIsNotNone(user)
            self.assertTrue(user.check_password('password123'))
            self.assertFalse(user.check_password('wrongpass'))

            # Check settings initialized
            settings = Settings.query.filter_by(user_id=user.id).first()
            self.assertIsNotNone(settings)
            self.assertEqual(settings.default_rate, 60.0)

    def test_daily_entry_and_calculations(self):
        # 1. Setup user
        self.client.post('/setup', data={
            'username': 'rahul',
            'password': 'password123',
            'confirm_password': 'password123'
        })

        # 2. Add entry for Nov 1, 2026: 1.5 L @ 60/L = Rs. 90
        res = self.client.post('/api/entry', json={
            'date': '2026-11-01',
            'received': True,
            'quantity': 1.5,
            'rate': 60.0
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['entry']['amount'], 90.0)
        self.assertEqual(data['entry']['quantity'], 1.5)

        # 3. Add entry for Nov 2, 2026: Milk not received
        res = self.client.post('/api/entry', json={
            'date': '2026-11-02',
            'received': False,
            'quantity': 0,
            'rate': 60.0
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['entry']['amount'], 0.0)
        self.assertFalse(data['entry']['received'])

        # 4. Update entry for Nov 1 to 2.0 L @ 60/L = Rs. 120 (edit existing, no duplicate)
        res = self.client.post('/api/entry', json={
            'date': '2026-11-01',
            'received': True,
            'quantity': 2.0,
            'rate': 60.0
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['entry']['amount'], 120.0)

        with self.app.app_context():
            entries = MilkEntry.query.filter_by(date=date(2026, 11, 1)).all()
            self.assertEqual(len(entries), 1)  # No duplicates

        # 5. Check monthly summary
        res = self.client.get('/api/monthly-summary/2026/11')
        self.assertEqual(res.status_code, 200)
        summary = res.get_json()
        self.assertEqual(summary['total_quantity'], 2.0)
        self.assertEqual(summary['total_bill'], 120.0)
        self.assertEqual(summary['received_days'], 1)
        self.assertEqual(summary['not_received_days'], 1)
        self.assertEqual(summary['pending_balance'], 120.0)

        # 6. Add payment of Rs. 100
        res = self.client.post('/api/payment', json={
            'date': '2026-11-05',
            'amount': 100.0,
            'notes': 'Google Pay UPI',
            'month': 11,
            'year': 2026
        })
        self.assertEqual(res.status_code, 200)

        # 7. Check pending balance is now 120 - 100 = Rs. 20
        res = self.client.get('/api/monthly-summary/2026/11')
        summary = res.get_json()
        self.assertEqual(summary['total_payments'], 100.0)
        self.assertEqual(summary['pending_balance'], 20.0)

        print("\nAll Milk Hisab core features verified successfully!")


if __name__ == '__main__':
    unittest.main()
