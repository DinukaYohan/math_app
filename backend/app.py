#API sever

from flask import Flask

app = Flask(__name__)

@app.route('/')
def home ():
    return '<h1> FLASK REST API </h1>'

if __name__ == '__main__':
    app.run(debug=True)