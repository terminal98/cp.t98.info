import json
import calendar
from datetime import datetime, timedelta
import requests

def on_fetch(request):
    # パラメータとして年月を取得
    year_month = event.get('year_month', '')
    if not year_month:
        return {
            'statusCode': 400,
            'body': json.dumps('Invalid input: year_month is required')
        }
    
    # JSONファイルの読み込み
    with open('schedule.json', 'r') as f:
        schedule = json.load(f)
    
    # 指定された年月の初日を計算
    start_date = datetime.strptime(year_month, '%Y-%m')
    end_date = start_date + timedelta(days=90)  # 3ヶ月後
    
    # 祝日情報の取得
    holidays_response = requests.get('https://holidays-jp.github.io/api/v1/date.json')
    holidays = holidays_response.json()

    with open('holidays.json', 'r') as f:
        holidays = json.load(f)
    
    # カレンダーのHTML生成
    html_calendar = '<html><body><table border="1"><tr><th>Date</th><th>Event</th></tr>'
    
    current_date = start_date
    while current_date < end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        event = schedule.get(date_str, 'No event')
        holiday = holidays.get(date_str, '')

        # 祝日の処理
        if '振替休日' in holiday:
            holiday = '振替休日'
        
        if event != 'No event' or holiday:
            event_display = f'{event}'
            if holiday:
                event_display += f' / {holiday}'
            html_calendar += f'<tr><td>{date_str}</td><td>{event_display}</td></tr>'
        
        current_date += timedelta(days=1)
    
    html_calendar += '</table></body></html>'
    
    return {
        'statusCode': 200,
        'body': html_calendar
    }

if __name__ == '__main__':
    event = {}
    event["year_month"] = "2024-10"
    print(on_fetch(event, ""))
