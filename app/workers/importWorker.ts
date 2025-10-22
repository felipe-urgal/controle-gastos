// app/workers/importWorker.ts
self.onmessage = async (e) => {
  const { transactions, accountId, userId } = e.data;
  
  try {
    const response = await fetch('/api/import/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions, accountId, userId })
    });
    
    const result = await response.json();
    
    self.postMessage({ 
      type: 'SUCCESS', 
      data: result 
    });
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
};