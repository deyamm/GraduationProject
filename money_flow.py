import numpy as np
import tushare as ts
import pandas as pd
import sqlalchemy as sa
import datetime
import math
import json
import os
import MySQLdb as sql

'''
    从数据源获取股票指定日期范围内的资金流向
'''
def moneyflow(pro, index, index_name, codes, start_date=None, end_date=None):
    conn = sa.create_engine('mysql+mysqldb://root:qq16281091@localhost:3306/moneyflow?charset=utf8')

    # 设置默认起止日期
    if start_date is None:
        start_date = '20200101'
    if end_date is None:
        end_date = '20200201'
    print(index_name + "start...")

    # 获取股票在指定日期范围内的资金流向数据并存到数据库moneyflow库中
    for code in codes:
        print(code + "start....")
        df = pro.moneyflow(ts_code=code, start_date=start_date, end_date=end_date)

        df.to_sql(name=code[:6], con=conn, if_exists='append', index=False,
                  dtype={'trade_date': sa.DateTime()})
        # df.to_csv('./static/data/moneyflow/' + index + '/' + code[:6] + '.csv', mode='a', index=False)
        # df.to_json('./static/data/moneyflow/' + index + '/' + code[:6] + '.json', orient='split', force_ascii=False)

        print(code + "complete")
    # data.to_csv('./static/data/moneyflow/' + index + '/' + index[:6] + '.csv', mode='a', index=False)
    # data.to_json('./static/data/moneyflow/' + index + '/' + index[:6] + '.json', orient='split', force_ascii=False)
    # df_json = data.to_json(orient='split', force_ascii=False)
    # data.set_index(["trade_date"], inplace=True)
    # data["net_amount"] = data["buy_lg_amount"] - data["sell_lg_amount"] + \
    #                      data["buy_elg_amount"] - data["sell_elg_amount"]
    print(index_name + "complete")


'''
    获取申万指数的成分股，start、end表示列表中指数的范围
'''
def swcodes(pro, level, start=None, end=None):
    if pro is None:
        pro = ts.pro_api('92c6ece658c377bcc32995a68319cf01696e1266ed60be0ae0dd0947')

    index_list = pro.index_classify(level=level, src="SW")

    if start is None:
        start = 0
    if end is None:
        end = len(index_list)

    for i in range(start, end):
        index = index_list['index_code'][i]
        index_name = index_list['industry_name'][i]

        codes = pro.index_member(index_code=index)['con_code'].values

        # moneyflow(pro, index, index_name, codes)

        cal_sw_money(index, index_name, codes)


'''
    构建申万三个等级行业的树状json数据
'''
def con_sw_tree(pro):
    l1 = pro.index_classify(level='L1', src='SW')
    l2 = pro.index_classify(level='L2', src='SW')
    l3 = pro.index_classify(level='L3', src='SW')

    stock_info = pro.stock_basic(exchange='', list_status='L', fields='ts_code, name')
    stock_info.set_index(["ts_code"], inplace=True)

    stock_unit = dict.fromkeys(['name', 'code', 'value'])
    index_unit = dict.fromkeys(['name', 'code', 'children'])

    root = index_unit.copy()
    root['name'] = 'root'
    root['code'] = None
    root['children'] = []

    # 文件格式 xxxxxx xxxxxx xxxxxx ... 每个指数为6个字符，第一个为父节点，之后的为子节点
    # lines1为一级与二级的数据， lines2为二级与三级的数据
    with open('./static/data/swl1.txt') as f:
        lines1 = f.readlines()

    with open('./static/data/swl2.txt') as f:
        lines2 = f.readlines()

    j = 0
    # 一级行业
    for line in lines1:
        codes = line.strip().split(' ')
        if len(codes) > 0:
            node = index_unit.copy()
            node['code'] = codes[0] + '.SI'
            node['name'] = l1[l1['index_code'] == node['code']]['industry_name'].values[0]
            node['children'] = []
            # 添加二级行业
            for i in range(1, len(codes)):
                child = index_unit.copy()
                child['code'] = codes[i] + '.SI'
                child['name'] = l2[l2['index_code'] == child['code']]['industry_name'].values[0]
                child['children'] = []
                # 添加三级行业
                line2 = lines2[j].strip().split(' ')
                j = j + 1
                if (line2[0] != child['code'][:6]) or len(line2) < 1:
                    print(line2[0] + ' error ' + child['code'][:6] + ' ' + str(len(line2)))
                    return
                for k in range(1, len(line2)):
                    gchild = index_unit.copy()
                    gchild['code'] = line2[k] + '.SI'
                    print(gchild['code'])
                    gchild['name'] = l3[l3['index_code'] == gchild['code']]['industry_name'].values[0]
                    gchild['children'] = []
                    # 添加股票列表
                    slist = pro.index_member(index_code=gchild['code'])['con_code'].values
                    for scode in slist:
                        schild = stock_unit.copy()
                        schild['code'] = scode
                        try:
                            schild['name'] = stock_info.loc[scode].values[0]
                        except KeyError:
                            print(scode + 'key error')
                            continue
                        else:
                            gchild['children'].append(schild)
                    child['children'].append(gchild)
                node['children'].append(child)
            root['children'].append(node)
    res = json.dumps(root, indent=1, ensure_ascii=False)
    # print(res)
    with open('./static/data/sw.json', 'w') as f:
        f.write(res)


'''
    构建三级行业向二级行业的映射以及二级行业向一级行业的映射
'''
def con_sw_map():

    with open('./static/data/swl1.txt') as f:
        lines1 = f.readlines()

    with open('./static/data/swl2.txt') as f:
        lines2 = f.readlines()

    res = dict()
    for line in lines1:
        line = line[:-1].split(' ')
        for i in range(1, len(line)):
            res[line[i]] = line[0]

    for line in lines2:
        line = line[:-1].split(' ')
        for i in range(1, len(line)):
            res[line[i]] = line[0]

    res = json.dumps(res, indent=1, ensure_ascii=False)
    print(res)
    with open('./static/data/sw_map.json', 'w') as f:
        f.write(res)

'''
    计算申万指数每天的大单及特大单的净流入，并存入数据库中
'''
def cal_sw_money(index, index_name, codes, start_date=None, end_date=None):
    connn = sa.create_engine('mysql+mysqldb://root:qq16281091@localhost:3306/sw_moneyflow?charset=utf8')

    if start_date is None:
        start_date = '20200101'
    if end_date is None:
        end_date = '20200201'
    print(index_name + "start...")
    path = './static/data/moneyflow/' + index
    # if not os.path.exists(path):
    #     os.makedirs(path)

    columns = ['trade_date', 'sm_net_amount', 'md_net_amount', 'lg_net_amount', 'elg_net_amount',
               'sm_net_vol', 'md_net_vol', 'lg_net_vol', 'elg_net_vol']
    features = ['trade_date', 'buy_sm_amount - sell_sm_amount as sm_net_amount',
                'buy_md_amount - sell_md_amount as md_net_amount', 'buy_lg_amount - sell_lg_amount as lg_net_amount',
                'buy_elg_amount - sell_elg_amount as elg_net_amount', 'buy_sm_vol - sell_sm_vol as sm_net_vol',
                'buy_md_vol - sell_md_vol as md_net_vol', 'buy_lg_vol - sell_lg_vol as lg_net_vol',
                'buy_elg_vol - sell_elg_vol as elg_net_vol']

    conn = sql.connect(host='localhost', port=3306, user='root', passwd='qq16281091', db='moneyflow')
    cur = conn.cursor()
    data = None
    for code in codes:
        # print(code + "start..")
        query = 'select %s from moneyflow.%s;' % (','.join(features), code[:6])
        try:
            cur.execute(query)
        except Exception as e:
            print('error')
            continue
        tmp = np.array(cur.fetchall())
        for line in tmp:
            line[0] = line[0].strftime("%Y%m%d")
        df = pd.DataFrame(tmp)

        try:
            df.columns = columns
        except Exception as e:
            print(code + 'empty table')
            continue

        df.set_index('trade_date', inplace=True)
        if data is None:
            data = df.copy()
        else:
            data = data.add(df, fill_value=0)
        # print(code + 'end')
    cur.close()

    data.to_sql(name=index[:6], con=connn, if_exists='append', index=True,
                dtype={'trade_date': sa.DateTime()})
    connn.execute("alter table sw_moneyflow.%s add primary key(trade_date);" % index[:6])
    print(index_name + "end")
    conn.close()


'''
    获取3D柱状图需要的数据
'''
def get_bar_data(paras):
    # print(paras)
    con = sql.connect(host='localhost', port=3306, user='root', passwd='qq16281091', db='sw_moneyflow')
    cur = con.cursor()

    data = dict()
    data['columns'] = []
    data['codes'] = []
    data['index'] = []
    # pro = ts.pro_api('92c6ece658c377bcc32995a68319cf01696e1266ed60be0ae0dd0947')
    # 根据参数来设置相应的目标数据
    # print(paras)
    if paras['dataType'] == '流入金额':
        data_type = 'amount'
    else:
        data_type = 'vol'
    data_range = []
    if 'sm' in paras.keys():
        data_range.append('sm_net_%s' % data_type)
    if 'md' in paras.keys():
        data_range.append('md_net_%s' % data_type)
    if 'lg' in paras.keys():
        data_range.append('lg_net_%s' % data_type)
    if 'elg' in paras.keys():
        data_range.append('elg_net_%s' % data_type)
    if paras['startDate'] == '' and paras['endDate'] == '':
        query_range = ''
    elif paras['startDate'] == '':
        query_range = ' where trade_date <= %s' % paras['startDate']
    elif paras['endDate'] == '':
        query_range = ' where trade_date >= %s' % paras['startDate']
    else:
        query_range = ' where trade_date between %s and %s'

    index_list = pd.read_csv("./static/data/%s_list.csv" % str.lower(paras['industryLevel']))
    tdata = None
    if int(paras['startIndex']) < 0:
        start_index = 0
    else:
        start_index = int(paras['startIndex'])
    if int(paras['endIndex']) >= len(index_list):
        end_index = len(index_list)-1
    else:
        end_index = int(paras['endIndex'])

    for i in range(start_index, end_index):
        index_name = index_list['industry_name'][i]
        index = index_list['index_code'][i]

        data['columns'].append(index_name)
        data['codes'].append(index)

        cur.execute("select trade_date, %s from sw_moneyflow.%s%s;" % ('+'.join(data_range), index[:6], query_range))
        tmp = np.array(cur.fetchall())
        for line in tmp:
            line[0] = line[0].strftime("%Y%m%d")
            line[1] = float(format(line[1], '.2f'))
        # print(tmp)
        if len(data['index']) == 0:
            data['index'] = list(tmp[:, 0])
            tdata = tmp.copy()
            # print(tdata)
        else:
            # column_stack 将矩阵列合并
            tdata = np.column_stack((tdata, tmp[:, 1]))

    data['data'] = tdata[:, 1:].tolist()
    data['sum'] = data['data']
    if paras['dataMethod'] == '累计':
        for i in range(1, len(data['sum'])):
            data['sum'][i] = np.around(np.sum([data['sum'][i], data['sum'][i - 1]], axis=0), 2).tolist()

    con.close()
    return data


'''
    获取矩形树图所需要的数据
    传入一级行业名称及日期，获取成分个股资金
'''
def get_treemap_data(paras):
    # print(paras)
    industry_name = paras['industry_name']
    date = paras['date']
    industry_code = paras['industry_code']
    treemap_paras = paras['treemapParas']
    # print(treemap_paras)

    data_range = []
    for key in treemap_paras.keys():
        if treemap_paras[key] == 'on':
            data_range.append('buy_%s_amount - sell_%s_amount' % (key, key))

    con = sql.connect(host='localhost', port=3306, user='root', passwd='qq16281091', db='moneyflow')
    cur = con.cursor()
    features = ['buy_sm_amount', 'sell_sm_amount', 'buy_md_amount', 'sell_md_amount',
                'buy_lg_amount', 'sell_lg_amount', 'buy_elg_amount', 'sell_elg_amount',
                'buy_lg_amount - sell_lg_amount + buy_elg_amount - sell_elg_amount as net_amount']

    with open('./static/data/sw.json') as f:
        sw_tree = json.load(f)

    with open('./static/data/sw_map.json') as f:
        sw_map = json.load(f)

    code_line = [industry_code[:6]]
    while code_line[-1] in sw_map.keys():
        code_line.append(sw_map[code_line[-1]])
    # print(code_line)

    target = sw_tree
    for i in range(len(code_line)-1, -1, -1):
        for child in target['children']:
            if child['code'][:6] == code_line[i]:
                target = child
                break

    dfs_line = [target]
    cur_parent = target
    while len(dfs_line) > 0:
        node = dfs_line.pop()
        if 'children' in node.keys():
            cur_parent = node
            for child in node['children']:
                dfs_line.append(child)
        else:
            ts_code = node['code']
            cur.execute(
                "select " + ' + '.join(data_range) +
                " from moneyflow.%s where trade_date=%s" % (ts_code[:6], date))
            res = np.array(cur.fetchall())
            # 如果个股无数据，则从树中删除该节点
            if len(res) is 0:
                # raise Exception(ts_code + "dateerror")
                # delcode.append(node)
                cur_parent['children'].remove(node)
            else:
                node['value'] = float(format(res[0, -1], '.2f'))
                node['date'] = date
                if node['value'] > 0:
                    node['mark'] = 1
                    if treemap_paras['dataType'] == '仅流出':
                        cur_parent['children'].remove(node)
                else:
                    node['mark'] = -1
                    if treemap_paras['dataType'] == '仅流入':
                        cur_parent['children'].remove(node)
    con.close()
    target['date'] = date
    # print(target)
    return target


'''
    获取堆叠柱状图所需要的数据
    传入个股代码、日期以及显示的天数
'''
def get_stackbar_data(paras):
    # print(paras)
    ts_code = paras['ts_code']
    date = paras['date']
    stack_paras = paras['stack_paras']
    days = int(stack_paras['days'])

    features = ['trade_date', 'buy_sm_amount', 'sell_sm_amount', 'buy_md_amount', 'sell_md_amount',
                'buy_lg_amount', 'sell_lg_amount', 'buy_elg_amount', 'sell_elg_amount']
    categories = ["小单流入", "小单流出", "中单流入", "中单流出",
                  "大单流入", "大单流出", "特大单流入", "特大单流出"]

    con = sql.connect(host='localhost', port=3306, user='root', passwd='qq16281091', db='moneyflow')
    cur = con.cursor()

    cur.execute("select trade_date from moneyflow.%s where trade_date between %s and %s;"
                % (ts_code[:6], str(int(date[: 4]) - 1) + date[4:], date))
    exist_date = list(map(lambda x: x[0].strftime('%Y%m%d'), np.array(cur.fetchall()).tolist()))
    # print(exist_date)

    if len(exist_date) < days:
        start_date = exist_date[-1]
    else:
        start_date = exist_date[days - 1]
    end_date = date

    query = 'select ' + ','.join(features) + ' from moneyflow.%s where trade_date between %s and %s' \
            % (ts_code[:6], start_date, end_date)
    cur.execute(query)
    tmp = np.array(cur.fetchall())
    for line in tmp:
        line[0] = line[0].strftime("%Y-%m-%d")

    data = pd.DataFrame(data=tmp, columns=features)
    res = dict()
    res['negative'] = ['特大单流出', '大单流出', '中单流出', '小单流出']
    res['positive'] = ['小单流入', '中单流入', '大单流入', '特大单流入']
    res['net'] = ["小单净流入", "中单净流入", "大单净流入", "特大单净流入"]
    res['data'] = []

    template = dict.fromkeys(['date', 'category', 'value'])
    for line in data.values:
        for i in range(1, len(line)):
            if i % 2 == 1:
                nunit = template.copy()
                nunit['date'] = line[0]
                nunit['category'] = res['net'][math.floor(i / 2)]
                nunit['value'] = float(format(line[i] - line[i + 1], '.2f'))
                res['data'].append(nunit)
            unit = template.copy()
            unit['date'] = line[0]
            unit['category'] = categories[i - 1]
            unit['value'] = line[i]
            res['data'].append(unit)

    return res


'''
    获取折线图的数据
'''
def get_line_data(paras):
    np.set_printoptions(suppress=True)

    # print(paras)
    industry_name = paras['industry_name']
    start_date = paras['start_date']
    end_date = paras['end_date']
    line_paras = paras['line_paras']
    industry_code = paras['industry_code']

    if line_paras['dataType'] == '流入金额':
        data_type = 'amount'
    else:
        data_type = 'vol'
    if line_paras['industry_level'] == 'L4':
        database_name = 'moneyflow'
    else:
        database_name = 'sw_moneyflow'

    con = sql.connect(host='localhost', port=3306, user='root', passwd='qq16281091', db=database_name)
    cur = con.cursor()
    features = []
    for key in line_paras.keys():
        if line_paras[key] == 'on':
            if database_name == 'moneyflow':
                features.append('buy_%s_%s - sell_%s_%s' % (key, data_type, key, data_type))
            else:
                features.append('%s_net_%s' % (key, data_type))

    with open('./static/data/sw.json') as f:
        sw_tree = json.load(f)

    with open('./static/data/sw_map.json') as f:
        sw_map = json.load(f)

    cur.execute(
        "select cal_date, is_open from trade_cal.trade_cal where cal_date between %s and %s" % (start_date, end_date))
    trade_cal = np.array(cur.fetchall())
    for line in trade_cal:
        line[0] = line[0].strftime('%Y-%m-%d')

    code_line = [industry_code[:6]]
    while code_line[-1] in sw_map.keys():
        code_line.append(sw_map[code_line[-1]])

    target = sw_tree
    for i in range(len(code_line) - 1, -1, -1):
        for child in target['children']:
            if child['code'][:6] == code_line[i]:
                target = child
                break

    data = dict()
    data['series'] = []
    data['dates'] = trade_cal[trade_cal[:, 1] == 1][:, 0].tolist()
    # print(type(data['dates']))

    def recur(cur_depth, node):
        if cur_depth == 0:
            cur.execute(
                "select " + ' + '.join(features) +
                " from %s.%s" % (database_name, node["code"][:6]))
            res = np.around(np.squeeze(np.array(cur.fetchall())), decimals=2)
            unit = dict()
            unit['industry_name'] = node['name']
            unit['index_code'] = node['code']
            for j in range(1, len(res)):
                res[j] = res[j] + res[j - 1]
            unit['values'] = np.around(res, decimals=2).tolist()
            data['series'].append(unit)
        else:
            for tchild in node['children']:
                recur(cur_depth-1, tchild)

    depth = int(line_paras['industry_level'][-1]) - len(code_line)
    for child in target['children']:
        recur(depth-1, child)

    cur.close()
    con.close()
    # print(data)
    data['industry_name'] = industry_name
    data['industry_code'] = industry_code
    return data


if __name__ == '__main__':
    token = '92c6ece658c377bcc32995a68319cf01696e1266ed60be0ae0dd0947'
    pro = ts.pro_api(token)

    '''
    trade_cal = pro.trade_cal()
    trade_cal.drop(['exchange'], axis=1, inplace=True)

    connn = sa.create_engine('mysql+mysqldb://root:qq16281091@localhost:3306/trade_cal?charset=utf8')
    trade_cal.to_sql(name='trade_cal', con=connn, if_exists='append', index=False,
                dtype={'cal_date': sa.DateTime()})
    connn.execute("alter table trade_cal.trade_cal add primary key(cal_date);")

    print(trade_cal)
    '''

    # con_sw_tree(pro)
    # swcodes(pro, 'L3')
    # res = get_money_data()
    # print(json.dumps(res, indent=1, ensure_ascii=False))
    # print(res['data'])
    # print(res['sum'])
    # data = get_treemap_data('化工', '20200123')
    # print(data)
    # print(pd.read_csv('./static/data/l1_list.csv'))
    # print(get_stackbar_data('000001.SZ', '20200123', 5))
    # get_line_data("建筑材料", '20200101', '20200201')
    # con_sw_map()

