import google.generativeai as genai

try:
    # Gemini APIキーを設定 (ここにあなたのAPIキーを設定してください)
    GENAI_API_KEY = "AIzaSyDO4SSiRMJOBw6LHvCskpSOLtT7E4YDS3M"

    # Gemini APIキーを設定
    genai.configure(api_key=GENAI_API_KEY)

    # 利用可能なモデルの一覧を取得
    text= ''
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            text += (f"モデル名: {m.name}\n")
            text += (f"  説明: {m.description}\n")
            text += (f"  入力トークン上限: {m.input_token_limit}\n")
            text += (f"  出力トークン上限: {m.output_token_limit}\n")
            text += ("---\n\n\n")

    print(text)
    with open('list_gemini_models.txt', "a", encoding="utf-8") as f:
        f.write(text)


except Exception as e:
    print(f"エラーが発生しました: {e}")