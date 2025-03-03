import axios from 'axios';

export async function GET(req: Request) {
  const urlParams = new URL(req.url);
  const tickers = urlParams.searchParams.get('tickers');

  if (!tickers) {
    return new Response(JSON.stringify({ error: 'Tickers são necessários' }), { status: 400 });
  }

  const tickersArray = tickers.split(',');
  const cotacoes: Record<string, string> = {};
  const apiKey = '50OXDK3F7AIV0OIJ'; // Substitua com sua chave do Alpha Vantage

  try {
    for (const ticker of tickersArray) {
      // URL para pegar a cotação usando a função "GLOBAL_QUOTE"
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}.SA&apikey=${apiKey}`;

      const { data } = await axios.get(url);

      if (data['Error Message']) {
        throw new Error(`Erro ao buscar cotações para ${ticker}`);
      }

      // Pegando o preço atual
      const preco = data['Global Quote']['05. price']; // Preço atual da ação/FII

      cotacoes[ticker] = preco;
    }

    return new Response(JSON.stringify({ cotacoes }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Erro ao buscar as cotações' }), { status: 500 });
  }
}
