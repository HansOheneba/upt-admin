import { BOOK_KEY, BOOK_VERSION, SESSION_KEY, type Book } from "@/lib/domain";
import { createSeed } from "@/lib/seed";

const serverBook = createSeed();
let clientBook: Book | null = null;
const bookListeners = new Set<() => void>();

let clientSession: string | null | undefined;
const sessionListeners = new Set<() => void>();

export function loadBook(): Book {
  if (typeof window === "undefined") return serverBook;
  try {
    const raw = window.localStorage.getItem(BOOK_KEY);
    if (!raw) return serverBook;
    const parsed = JSON.parse(raw) as Book;
    if (parsed.version !== BOOK_VERSION || !Array.isArray(parsed.members)) {
      return serverBook;
    }
    return parsed;
  } catch {
    return serverBook;
  }
}

export function getServerBook() {
  return serverBook;
}

export function getClientBook() {
  if (!clientBook) clientBook = loadBook();
  return clientBook;
}

export function subscribeBook(listener: () => void) {
  bookListeners.add(listener);
  return () => bookListeners.delete(listener);
}

export function writeBook(book: Book) {
  clientBook = book;
  window.localStorage.setItem(BOOK_KEY, JSON.stringify(book));
  bookListeners.forEach((listener) => listener());
}

export function loadSession() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(SESSION_KEY);
}

export function getServerSession(): string | null {
  return null;
}

export function getClientSession() {
  if (clientSession === undefined) clientSession = loadSession();
  return clientSession;
}

export function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export function writeSession(staffId: string | null) {
  clientSession = staffId;
  if (staffId) window.sessionStorage.setItem(SESSION_KEY, staffId);
  else window.sessionStorage.removeItem(SESSION_KEY);
  sessionListeners.forEach((listener) => listener());
}
