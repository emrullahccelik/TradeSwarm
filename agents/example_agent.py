import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

# .env dosyasını yükle
load_dotenv()

def run_example_agent(query: str):
    # OpenRouter üzerinden Langchain ChatOpenAI sınıfını kullanarak bağlanıyoruz
    llm = ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        temperature=0
    )
    prompt = PromptTemplate.from_template("Sen yardımsever bir asistansın. Kullanıcının sorusunu yanıtla: {query}")
    chain = prompt | llm
    
    response = chain.invoke({"query": query})
    return response.content

if __name__ == "__main__":
    # Test için
    print(run_example_agent("Merhaba, nasılsın?"))
