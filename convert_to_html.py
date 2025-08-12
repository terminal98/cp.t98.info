import re
import argparse
import os
import html

def convert_text_to_html(input_path: str, output_path: str) -> None:
    """
    テキストファイルを読み込み、URLを<a>タグに、改行を<p>と<br>タグに変換して
    HTMLファイルとして出力します。

    Args:
        input_path (str): 入力テキストファイルのパス。
        output_path (str): 出力HTMLファイルのパス。
    """
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # URLを検出する正規表現パターン
        # http/httpsで始まり、空白、<, >, " 以外の文字が続くものをURLとみなす
        url_pattern = re.compile(r'(https?://[^\s<>"]+)')

        # 連続した改行で段落に分割
        paragraphs = content.strip().split('\n\n')
        
        html_body_parts = []
        for para in paragraphs:
            # URLとそれ以外のテキスト部分に分割
            parts = url_pattern.split(para)
            
            processed_parts = []
            for i, part in enumerate(parts):
                if i % 2 == 1:  # URL部分
                    # URLはエスケープして安全なリンクにする
                    escaped_url = html.escape(part)
                    processed_parts.append(f'<a href="{escaped_url}" target="_blank" rel="noopener noreferrer">{escaped_url}</a>')
                else:  # テキスト部分
                    # テキストをエスケープし、改行を<br>に変換
                    escaped_part = html.escape(part)
                    processed_parts.append(escaped_part.replace('\n', '<br />\n'))
            
            # <p>タグで囲む
            html_body_parts.append(f'<p>{"".join(processed_parts)}</p>')

        html_body = '\n'.join(html_body_parts)

        # HTMLの骨格を作成
        title = html.escape(os.path.basename(input_path))
        html_template = f"""<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.7;
            max-width: 800px;
            margin: 2em auto;
            padding: 0 1em;
            background-color: #fdfdfd;
            color: #333;
        }}
        p {{
            margin: 1.2em 0;
        }}
        a {{
            word-break: break-all;
            color: #007bff;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
    </style>
</head>
<body>
{html_body}
</body>
</html>
"""

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_template)
        
        print(f"✅ 変換が完了しました: '{input_path}' -> '{output_path}'")

    except FileNotFoundError:
        print(f"❌ エラー: 入力ファイルが見つかりません '{input_path}'")
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='テキストファイルをHTMLに変換します。URLはリンクに、改行は<p>と<br>タグになります。'
    )
    parser.add_argument('input_file', help='入力テキストファイルのパス')
    parser.add_argument(
        '-o', '--output', 
        help='出力HTMLファイルのパス (デフォルト: 入力ファイル名.html)'
    )
    
    args = parser.parse_args()
    
    input_file = args.input_file
    
    if args.output:
        output_file = args.output
    else:
        base, _ = os.path.splitext(input_file)
        output_file = base + '.html'
        
    convert_text_to_html(input_file, output_file)
