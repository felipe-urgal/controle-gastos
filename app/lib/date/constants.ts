export const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const dayNamesFull = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export const monthOptions = monthNames.map((name, index) => ({
  value: index + 1,
  label: name,
}));

export const yearOptions = Array.from({ length: 6 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return {
    value: year,
    label: String(year),
  };
});
