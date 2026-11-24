import os
from datetime import datetime, timezone, date, timedelta
import calendar
from functools import wraps

from flask import (
    Flask, render_template, request, redirect, url_for,
    session, flash, jsonify, make_response
)
from sqlalchemy import func, extract

from config import config, Config
from models import db, User, MilkEntry, Payment, Settings


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')

    app = Flask(__name__)

    # Load config
    cfg = config.get(config_name, config['default'])
    app.config.from_object(cfg)

    # Set database URI explicitly
    db_url = Config.get_database_url()
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # Initialize extensions
    db.init_app(app)

    # Create tables safely
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            app.logger.warning(f"Initial db.create_all() notice: {e}")

    # ---- Auth decorator ----
    def login_required(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return redirect(url_for('login'))
            return f(*args, **kwargs)
        return decorated_function

    # ---- Helper: monthly summary ----
    def get_monthly_summary(user_id, year, month):
        entries = MilkEntry.query.filter_by(user_id=user_id).filter(
            extract('year', MilkEntry.date) == year,
            extract('month', MilkEntry.date) == month
        ).all()

        total_quantity = sum(e.quantity for e in entries if e.received)
        total_bill = sum(e.amount for e in entries if e.received)
        received_days = sum(1 for e in entries if e.received)
        not_received_days = sum(1 for e in entries if not e.received)

        payments = Payment.query.filter_by(
            user_id=user_id, year=year, month=month
        ).all()
        total_payments = sum(p.amount for p in payments)

        # Calculate carry forward from previous months
        carry_forward = get_pending_balance_before(user_id, year, month)

        pending_balance = carry_forward + total_bill - total_payments

        return {
            'year': year,
            'month': month,
            'month_name': calendar.month_name[month],
            'total_quantity': round(total_quantity, 2),
            'total_bill': round(total_bill, 2),
            'received_days': received_days,
            'not_received_days': not_received_days,
            'total_payments': round(total_payments, 2),
            'carry_forward': round(carry_forward, 2),
            'pending_balance': round(pending_balance, 2),
            'entries': [e.to_dict() for e in entries],
            'payments': [p.to_dict() for p in payments]
        }

    def get_pending_balance_before(user_id, year, month):
        """Calculate total pending balance from all months before given month."""
        total_bill = db.session.query(
            func.coalesce(func.sum(MilkEntry.amount), 0)
        ).filter(
            MilkEntry.user_id == user_id,
            MilkEntry.received == True,
            MilkEntry.date < date(year, month, 1)
        ).scalar()

        total_payments = db.session.query(
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(
            Payment.user_id == user_id,
            Payment.date < date(year, month, 1)
        ).scalar()

        return round(float(total_bill) - float(total_payments), 2)

    def get_total_pending_balance(user_id):
        """Calculate overall pending balance across all months."""
        total_bill = db.session.query(
            func.coalesce(func.sum(MilkEntry.amount), 0)
        ).filter(
            MilkEntry.user_id == user_id,
            MilkEntry.received == True
        ).scalar()

        total_payments = db.session.query(
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(Payment.user_id == user_id).scalar()

        return round(float(total_bill) - float(total_payments), 2)

    # ============================================================
    # AUTH ROUTES
    # ============================================================

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if 'user_id' in session:
            return redirect(url_for('dashboard'))

        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')

            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                session['user_id'] = user.id
                session['username'] = user.username
                session.permanent = True
                flash('Login successful!', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Invalid username or password.', 'danger')

        return render_template('login.html')

    @app.route('/register', methods=['GET', 'POST'])
    @app.route('/setup', methods=['GET', 'POST'])
    def register():
        """User registration / sign up."""
        if 'user_id' in session:
            return redirect(url_for('dashboard'))

        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')
            confirm = request.form.get('confirm_password', '')

            if not username or not password:
                flash('Username and password are required.', 'danger')
            elif len(password) < 6:
                flash('Password must be at least 6 characters.', 'danger')
            elif password != confirm:
                flash('Passwords do not match.', 'danger')
            elif User.query.filter_by(username=username).first():
                flash('This username already exists. Please choose a different one.', 'danger')
            else:
                user = User(username=username)
                user.set_password(password)
                db.session.add(user)
                db.session.flush()

                # Create default settings
                settings = Settings(user_id=user.id, default_rate=60.0, default_quantity=1.0)
                db.session.add(settings)
                db.session.commit()

                session['user_id'] = user.id
                session['username'] = user.username
                session.permanent = True
                flash('Account created successfully! Welcome to Milk Hisab.', 'success')
                return redirect(url_for('dashboard'))

        return render_template('register.html')

    @app.route('/logout')
    def logout():
        session.clear()
        flash('You have been logged out.', 'info')
        return redirect(url_for('login'))

    # ============================================================
    # PAGE ROUTES
    # ============================================================

    @app.route('/')
    @login_required
    def dashboard():
        return render_template('dashboard.html')

    @app.route('/calendar')
    @app.route('/calendar/<int:year>/<int:month>')
    @login_required
    def calendar_view(year=None, month=None):
        today = date.today()
        if year is None:
            year = today.year
        if month is None:
            month = today.month
        return render_template('calendar.html', year=year, month=month)

    @app.route('/payments')
    @login_required
    def payments_view():
        return render_template('payments.html')

    @app.route('/reports')
    @app.route('/reports/<int:year>/<int:month>')
    @login_required
    def reports_view(year=None, month=None):
        today = date.today()
        if year is None:
            year = today.year
        if month is None:
            month = today.month
        return render_template('reports.html', year=year, month=month)

    @app.route('/settings')
    @login_required
    def settings_view():
        return render_template('settings.html')

    # ============================================================
    # API ROUTES
    # ============================================================

    @app.route('/api/dashboard')
    @login_required
    def api_dashboard():
        user_id = session['user_id']
        today = date.today()

        # Today's entry
        today_entry = MilkEntry.query.filter_by(
            user_id=user_id, date=today
        ).first()

        # Current month summary
        summary = get_monthly_summary(user_id, today.year, today.month)

        # Total pending balance
        total_pending = get_total_pending_balance(user_id)

        # Last 6 months data for chart
        chart_data = []
        for i in range(5, -1, -1):
            d = today.replace(day=1)
            for _ in range(i):
                d = (d - timedelta(days=1)).replace(day=1)
            m_summary = get_monthly_summary(user_id, d.year, d.month)
            chart_data.append({
                'month': f"{calendar.month_abbr[d.month]} {d.year}",
                'quantity': m_summary['total_quantity'],
                'bill': m_summary['total_bill']
            })

        return jsonify({
            'today': today_entry.to_dict() if today_entry else None,
            'current_month': summary,
            'total_pending': total_pending,
            'chart_data': chart_data
        })

    @app.route('/api/entry', methods=['POST'])
    @login_required
    def api_add_entry():
        user_id = session['user_id']
        data = request.get_json()

        try:
            entry_date = date.fromisoformat(data['date'])
        except (KeyError, ValueError):
            return jsonify({'error': 'Invalid date format'}), 400

        received = data.get('received', True)
        quantity = float(data.get('quantity', 0)) if received else 0.0
        rate = float(data.get('rate', 0))
        amount = round(quantity * rate, 2) if received else 0.0

        # Check for existing entry
        existing = MilkEntry.query.filter_by(
            user_id=user_id, date=entry_date
        ).first()

        if existing:
            existing.received = received
            existing.quantity = quantity
            existing.rate = rate
            existing.amount = amount
            existing.updated_at = datetime.now(timezone.utc)
            entry = existing
            message = 'Entry updated successfully'
        else:
            entry = MilkEntry(
                user_id=user_id,
                date=entry_date,
                received=received,
                quantity=quantity,
                rate=rate,
                amount=amount
            )
            db.session.add(entry)
            message = 'Entry added successfully'

        db.session.commit()
        return jsonify({'message': message, 'entry': entry.to_dict()})

    @app.route('/api/entry/<entry_date>')
    @login_required
    def api_get_entry(entry_date):
        user_id = session['user_id']
        try:
            d = date.fromisoformat(entry_date)
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400

        entry = MilkEntry.query.filter_by(user_id=user_id, date=d).first()

        # Get user settings for defaults
        settings = Settings.query.filter_by(user_id=user_id).first()
        defaults = settings.to_dict() if settings else {'default_rate': 60.0, 'default_quantity': 1.0}

        return jsonify({
            'entry': entry.to_dict() if entry else None,
            'defaults': defaults
        })

    @app.route('/api/entry/<int:entry_id>', methods=['DELETE'])
    @login_required
    def api_delete_entry(entry_id):
        user_id = session['user_id']
        entry = MilkEntry.query.filter_by(id=entry_id, user_id=user_id).first()
        if not entry:
            return jsonify({'error': 'Entry not found'}), 404
        db.session.delete(entry)
        db.session.commit()
        return jsonify({'message': 'Entry deleted successfully'})

    @app.route('/api/entries/<int:year>/<int:month>')
    @login_required
    def api_get_entries(year, month):
        user_id = session['user_id']
        entries = MilkEntry.query.filter_by(user_id=user_id).filter(
            extract('year', MilkEntry.date) == year,
            extract('month', MilkEntry.date) == month
        ).order_by(MilkEntry.date).all()

        return jsonify({
            'entries': [e.to_dict() for e in entries]
        })

    @app.route('/api/monthly-summary/<int:year>/<int:month>')
    @login_required
    def api_monthly_summary(year, month):
        user_id = session['user_id']
        summary = get_monthly_summary(user_id, year, month)
        return jsonify(summary)

    @app.route('/api/payment', methods=['POST'])
    @login_required
    def api_add_payment():
        user_id = session['user_id']
        data = request.get_json()

        try:
            payment_date = date.fromisoformat(data['date'])
        except (KeyError, ValueError):
            return jsonify({'error': 'Invalid date format'}), 400

        amount = float(data.get('amount', 0))
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400

        notes = data.get('notes', '').strip()
        month = int(data.get('month', payment_date.month))
        year = int(data.get('year', payment_date.year))

        payment = Payment(
            user_id=user_id,
            date=payment_date,
            amount=amount,
            notes=notes,
            month=month,
            year=year
        )
        db.session.add(payment)
        db.session.commit()

        return jsonify({'message': 'Payment added successfully', 'payment': payment.to_dict()})

    @app.route('/api/payment/<int:payment_id>', methods=['DELETE'])
    @login_required
    def api_delete_payment(payment_id):
        user_id = session['user_id']
        payment = Payment.query.filter_by(id=payment_id, user_id=user_id).first()
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': 'Payment deleted successfully'})

    @app.route('/api/payments/<int:year>/<int:month>')
    @login_required
    def api_get_payments(year, month):
        user_id = session['user_id']
        payments = Payment.query.filter_by(
            user_id=user_id, year=year, month=month
        ).order_by(Payment.date).all()

        summary = get_monthly_summary(user_id, year, month)

        return jsonify({
            'payments': [p.to_dict() for p in payments],
            'summary': summary
        })

    @app.route('/api/report/<int:year>/<int:month>')
    @login_required
    def api_report(year, month):
        user_id = session['user_id']
        summary = get_monthly_summary(user_id, year, month)
        return jsonify(summary)

    @app.route('/api/settings', methods=['GET', 'POST'])
    @login_required
    def api_settings():
        user_id = session['user_id']

        if request.method == 'POST':
            data = request.get_json()
            settings = Settings.query.filter_by(user_id=user_id).first()
            if not settings:
                settings = Settings(user_id=user_id)
                db.session.add(settings)

            settings.default_rate = float(data.get('default_rate', 60.0))
            settings.default_quantity = float(data.get('default_quantity', 1.0))
            db.session.commit()
            return jsonify({'message': 'Settings saved', 'settings': settings.to_dict()})

        settings = Settings.query.filter_by(user_id=user_id).first()
        return jsonify({
            'settings': settings.to_dict() if settings else {
                'default_rate': 60.0,
                'default_quantity': 1.0
            }
        })

    # ---- Error handlers ----
    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not found'}), 404
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def server_error(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error'}), 500
        return render_template('500.html'), 500

    # ---- Context processor ----
    @app.context_processor
    def inject_now():
        return {'now': datetime.now(timezone.utc)}

    # Protect routes and ensure login
    @app.before_request
    def check_setup():
        if request.endpoint not in ('register', 'setup', 'login', 'static', 'logout'):
            if 'user_id' not in session:
                return redirect(url_for('login'))

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
