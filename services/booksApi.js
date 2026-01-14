
const API_KEY = 'AIzaSyDbBM67JvK44bncnqw22TKRz4pnvBn1tbo'; 
const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

export async function searchBooks(query, filter = 'all') {
  let q = query;
  if (filter === 'title') q = `intitle:${query}`;
  if (filter === 'author') q = `inauthor:${query}`;
  if (filter === 'isbn') q = `isbn:${query}`;

  const url = `${BASE_URL}?q=${encodeURIComponent(q)}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  return data.items || [];
}
