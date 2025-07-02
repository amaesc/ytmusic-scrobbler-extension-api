import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import bcrypt
from functools import wraps
import jwt
import datetime
from flask import send_file
import io
import pandas as pd
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config['SECRET_KEY'] = 'your-super-secret-key-OMG-Dayana-OMG'

# HASH the password
def hash_password(plain_password):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

# VERIFY password against hashed version
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# DB connection
def get_db_connection():
    return psycopg2.connect(
        dbname='Scrobbler_API',
        user='postgres',
        password='Aliso1917-',
        host='localhost'
    )

# JWT Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # JWT token passed in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header[len('Bearer '):]

        if not token:
            return jsonify({'error': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = data['user_id']

            # Load user info from DB
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT email, user_type FROM users WHERE id = %s AND is_active = TRUE", (user_id,))
            user = cur.fetchone()
            cur.close()
            conn.close()

            if not user:
                return jsonify({'error': 'User not found or inactive'}), 401

            # Save user info in request context
            request.user = {
                'id': user_id,
                'email': user[0],
                'user_type': user[1]
            }

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token!'}), 401

        return f(*args, **kwargs)
    return decorated

# Admin required decorator
def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.user['user_type'] != 'Admin':
            return jsonify({"error": "Admin privileges required"}), 403
        return f(*args, **kwargs)
    return decorated

# Test DB connection
@app.route('/testDataBaseConnection', methods=['GET'])
def testDataBaseConnection():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        result = cur.fetchone()
        cur.close()
        conn.close()

        return jsonify({"success": True, "test_result": result[0]}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Add new user (registration)
@app.route('/addNewUser', methods=['POST'])
def addNewUser():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    password_hash = hash_password(password)

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_email = cur.fetchone()
        if existing_email:
            cur.close()
            conn.close()
            return jsonify({"error": "Email already exists"}), 409

        cur.execute(
            "INSERT INTO users (email, password_hash, user_type) VALUES (%s, %s, 'Normal')",
            (email, password_hash)
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": "User added successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Login and get token
@app.route('/loginUser', methods=['POST'])
def login_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    print("------------------ LOGIN ---------------------")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, password_hash FROM users WHERE email = %s AND is_active = TRUE", (email,))
        user = cur.fetchone()

        if not user:
            cur.close()
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401

        user_id, password_hash = user

        if not verify_password(password, password_hash):
            cur.close()
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401

        # Generate JWT token (valid 1 hour)
        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        cur.close()
        conn.close()

        return jsonify({
            "message": "Login successful",
            "token": token
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500






@app.route('/scrobbleTrack', methods=['POST'])
@token_required
def scrobble_track():
    print("-------------------- SCROBBLE TRACK -----------------------")
    data = request.get_json()

    photo_url = data.get('photo_url')
    song_name = data.get('song_name')
    album_name = data.get('album_name')
    artist_name = data.get('artist_name')
    song_year = data.get('song_year')

    if not song_name or not artist_name:
        return jsonify({"error": "song_name and artist_name are required"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO music (user_id, photo_url, song_name, album_name, artist_name, song_year)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            request.user['id'],
            photo_url,
            song_name,
            album_name,
            artist_name,
            song_year
        ))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"message": "Track scrobbled successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500





@app.route('/scrobbleHistory', methods=['GET'])
@token_required
def scrobble_history():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                id, 
                song_name, 
                artist_name, 
                album_name, 
                song_year, 
                is_favorite, 
                listened_at,
                photo_url
            FROM music
            WHERE user_id = %s
            ORDER BY listened_at DESC
        """, (request.user['id'],))

        rows = cur.fetchall()
        cur.close()
        conn.close()

        history = []
        for row in rows:
            history.append({
                'id': row[0],
                'song_name': row[1],
                'artist_name': row[2],
                'album_name': row[3],
                'song_year': row[4],
                'is_favorite': row[5],
                'listened_at': row[6].isoformat() if row[6] else None,
                'photo_url': row[7]
            })

        return jsonify({'history': history}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500







@app.route('/deleteTrack/<int:track_id>', methods=['DELETE'])
@token_required
def delete_track(track_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Make sure the track belongs to the user
        cur.execute("SELECT id FROM music WHERE id = %s AND user_id = %s", (track_id, request.user['id']))
        track = cur.fetchone()

        if not track:
            cur.close()
            conn.close()
            return jsonify({"error": "Track not found or does not belong to user"}), 404

        # Delete the track
        cur.execute("DELETE FROM music WHERE id = %s", (track_id,))
        conn.commit()

        cur.close()
        conn.close()

        return jsonify({"message": f"Track {track_id} deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500







@app.route('/toggleFavorite/<int:track_id>', methods=['PATCH'])
@token_required
def toggle_favorite(track_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Get the song name and current is_favorite status of the target track
        cur.execute("""
            SELECT song_name, is_favorite
            FROM music
            WHERE id = %s AND user_id = %s
        """, (track_id, request.user['id']))
        song = cur.fetchone()

        if not song:
            cur.close()
            conn.close()
            return jsonify({"error": "Track not found or does not belong to user"}), 404

        song_name, current_is_favorite = song
        new_is_favorite = not current_is_favorite

        # 2. Update all rows with the same song_name and user_id
        cur.execute("""
            UPDATE music
            SET is_favorite = %s
            WHERE user_id = %s AND song_name = %s
        """, (new_is_favorite, request.user['id'], song_name))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "message": f"All songs named '{song_name}' marked as {'favorite' if new_is_favorite else 'not favorite'}",
            "is_favorite": new_is_favorite
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/updateTrack/<int:track_id>', methods=['PATCH'])
@token_required
def update_track(track_id):
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()

        # Confirm the track belongs to the user
        cur.execute("SELECT id FROM music WHERE id = %s AND user_id = %s", (track_id, request.user['id']))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Track not found or unauthorized'}), 404

        # Update values
        cur.execute("""
            UPDATE music
            SET photo_url = %s,
                song_name = %s,
                album_name = %s,
                artist_name = %s,
                listened_at = %s
            WHERE id = %s
        """, (
            data['photo_url'],
            data['song_name'],
            data['album_name'],
            data['artist_name'],
            data['listened_at'],
            track_id
        ))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': f'Track {track_id} updated successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500





@app.route('/exportScrobbleHistory', methods=['GET'])
@token_required
def export_scrobble_history():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                id, 
                song_name, 
                artist_name, 
                album_name, 
                song_year, 
                is_favorite, 
                listened_at,
                photo_url
            FROM music
            WHERE user_id = %s
            ORDER BY listened_at DESC
        """, (request.user['id'],))

        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Convert to DataFrame
        df = pd.DataFrame(rows, columns=[
            'ID', 'Song Name', 'Artist Name', 'Album Name', 
            'Year', 'Is Favorite', 'Listened At', 'Photo URL'
        ])
        df = df.applymap(lambda x: x.replace('\n', ' ') if isinstance(x, str) else x)
        # Save to Excel in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Scrobble History')

        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='scrobble_history.xlsx'
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500





@app.route('/me', methods=['GET'])
@token_required
def get_current_user():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT email, is_active
            FROM users
            WHERE id = %s
        """, (request.user['id'],))

        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            return jsonify({
                'email': user[0],
                'is_active': user[1]
            }), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500






@app.route('/changePassword', methods=['PATCH'])
@token_required
def change_password():
    try:
        data = request.json
        old_password = data.get('old_password')
        new_password = data.get('new_password')

        if not old_password or not new_password:
            return jsonify({'error': 'Both current and new password are required'}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        # Get hashed password from DB
        cur.execute("SELECT password_hash FROM users WHERE id = %s", (request.user['id'],))
        result = cur.fetchone()

        if not result:
            cur.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        stored_hash = result[0]

        if not verify_password(old_password, stored_hash):
            cur.close()
            conn.close()
            return jsonify({'error': 'Current password is incorrect'}), 403

        # Hash new password
        new_hashed = hash_password(new_password)

        # Update
        cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hashed, request.user['id']))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': 'Password updated successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/backupJson', methods=['GET'])
@token_required
def backup_json():
    try:
        # Crear la carpeta backups si no existe
        os.makedirs('backups', exist_ok=True)

        conn = get_db_connection()
        cur = conn.cursor()

        # Obtener la información de este usuario
        cur.execute("""
            SELECT 
                id, 
                song_name, 
                artist_name, 
                album_name, 
                listened_at,
                is_favorite,
                photo_url
            FROM music
            WHERE user_id = %s
        """, (request.user['id'],))

        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Convertir filas a lista de diccionarios
        backup_data = []
        for row in rows:
            backup_data.append({
                'id': row[0],
                'song_name': row[1],
                'artist_name': row[2],
                'album_name': row[3],
                'listened_at': row[4].isoformat() if row[4] else None,
                'is_favorite': row[5],
                'photo_url': row[6]
            })

        # Ruta del archivo
        backup_path = os.path.join('backups', f'backup_user_{request.user["id"]}.json')

        # Guardar como archivo JSON
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=4)

        return jsonify({'message': f'Backup created at {backup_path}'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500



from flask import send_from_directory

@app.route('/downloadBackupJson', methods=['GET'])
@token_required
def download_backup_json():
    try:
        user_id = request.user['id']
        folder = os.path.join(os.getcwd(), 'backups')
        filename = f'backup_user_{user_id}.json'
        file_path = os.path.join(folder, filename)

        if not os.path.exists(file_path):
            return jsonify({'error': 'Backup file not found'}), 404

        return send_from_directory(
            directory=folder,
            path=filename,
            as_attachment=True,
            mimetype='application/json',
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True, ssl_context='adhoc')
