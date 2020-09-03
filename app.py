from flask import Flask, request
from flask import render_template
import MySQLdb as sql
import pandas as pd
import datetime
import numpy as np
import draw_graph as draw
import money_flow as mf
import json
import tushare as ts
import chardet
import os

app = Flask(__name__)


@app.route('/')
def index():
    return render_template("home.html")


@app.route('/stock/<code>')
def show_stock(code):
    indexs = ['000001.SH', '000009.SH', '000010.SH', '000016.SH', '399001.SZ', '399005.SZ', '399006.SZ']
    if code in indexs:
        return render_template("404.html")
    else:
        conn = sql.connect(host='localhost', port=3306, user='root', passwd='qq16281091', db='stock')
        cur = conn.cursor()
        cur.execute("select trade_date, open, close, low, high, ma5, ma10, ma20, ma30, vol from %s_daily "
                    "where trade_date between '20190625' and '20191025'" % code[:6])

        data = np.array(cur.fetchall())
        cur.close()

    for line in data:
        line[0] = line[0].strftime("%Y-%m-%d")

    date = data[:, 0].tolist()
    price = data[:, 1:5].tolist()
    ma = []
    for i in range(5, data.shape[1] - 1):
        ma.append(data[:, i].tolist())
    vol = data[:, data.shape[1] - 1].tolist()

    daily_tab = draw.draw_tab(code, date, price, ma, vol)

    daily_tab.render("./templates/stock.html")
    return render_template("stock.html")


@app.route('/index/<code>')
def show_index(code):
    indexs = ['000001.SH', '000009.SH', '000010.SH', '000016.SH', '399001.SZ', '399005.SZ', '399006.SZ']
    if code not in indexs:
        return render_template("404.html")
    else:
        conn = sql.connect(host='localhost', port=3306, user='root', passwd='qq16281091', db='indexs')
        cur = conn.cursor()
        cur.execute("select trade_date, open, close, low, high, ma5, ma10, ma20, ma30, vol from %s_daily "
                    "where trade_date between '20190625' and '20191025'" % code[:6])
        data = np.array(cur.fetchall())
        cur.close()

    date_i = data[:, 0].tolist()
    price_i = data[:, 1:5].tolist()
    ma_i = []
    for i in range(5, data.shape[1]-1):
        ma_i.append(data[:, i].tolist())
    vol_i = data[:, data.shape[1]-1].tolist()

    index_daily_tab = draw.draw_tab(code, date_i, price_i, ma_i, vol_i)
    index_daily_tab.render("./templates/index_g.html")
    return render_template('index_g.html')


@app.route('/bar')
def show_bar():
    # data1 = mf.get_bar_data()
    return render_template('three.html')


'''
@app.route('/stackbar')
def show_stackbar():
    # data = mf.get_treemap_data('化工', '20200123')
    data = mf.get_stackbar_data(ts_code="000001.SZ", date="20200123", days=5)
    return render_template('stackbar.html', data=data)
'''

@app.route('/bar/treemap_data', methods=['GET', 'POST'])
def treemap_data():
    recv = request.get_data()
    if recv:
        # print(str(recv, encoding='utf-8'))
        recv = json.loads(str(recv, encoding='utf-8'))
        return json.dumps(mf.get_treemap_data(recv), indent=1, ensure_ascii=False)
    else:
        print("None received")
        return json.dumps({'status': 'error'})


@app.route('/stackbar/send_data', methods=['GET', 'POST'])
def stack_bar_data():
    recv = request.get_data()
    if recv:
        recv = json.loads(str(recv, encoding='utf-8'))
        return json.dumps(mf.get_stackbar_data(recv))
    else:
        print("None received")
        return json.dumps({'status': 'error'})


@app.route('/bar/line_data', methods=['GET', 'POST'])
def bar_line_data():
    recv = request.get_data()
    if recv:
        recv = json.loads(str(recv, encoding='utf-8'))
        return json.dumps(mf.get_line_data(recv))
    else:
        print("None received")
        return json.dumps({'status': 'error'})


@app.route('/bar/bar_paras', methods=['GET', 'POST'])
def paras_bar_data():
    recv = request.get_data()
    if recv:
        recv = json.loads(str(recv, encoding='utf-8'))
        return json.dumps(mf.get_bar_data(recv), indent=1, ensure_ascii=False)
    else:
        print("None received")
        return json.dumps({'status': 'error'})


@app.route('/file/save', methods=['GET', 'POST'])
def create_file():
    recv = request.get_data()
    dirs = os.listdir('./static/tmp/')
    for file in dirs:
        os.remove('./static/tmp/' + file)

    if recv:
        recv = json.loads(str(recv, encoding='utf-8'))
        res = json.dumps(recv['data'], indent=1, ensure_ascii=False)
        if len(recv['filename']) > 5 and recv['filename'][-5:] == '.json':
            path = './static/tmp/' + recv['filename']
        else:
            path = './static/tmp/' + recv['filename'] + '.json'
        with open(path, 'w') as f:
            f.write(res)
        return json.dumps({'status': 'success', 'filename': path.split('/')[-1]})
    else:
        return json.dumps({'status': 'error'})

if __name__ == '__main__':
    app.run()
