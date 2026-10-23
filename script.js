const pages = ['home', 'zapp', 'pixel', 'games', 'credits'];
const track = document.querySelector('.track');
const panels = [...track.children];
const tabs = [...document.querySelectorAll('.nav a')];

function show() {
  const i = Math.max(0, pages.indexOf(location.hash.slice(1)));
  track.style.transform = `translateX(${-i * 100}%)`;
  panels.forEach((panel, n) => panel.inert = n !== i);
  tabs.forEach((tab, n) => tab.classList.toggle('active', n === i));
}

show();
setTimeout(() => track.classList.add('slide'));
addEventListener('hashchange', show);

const link = (text, url) => Object.assign(document.createElement('a'), {
  textContent: text,
  href: /^https?:\/\//i.test(url) ? url : '#',
  target: '_blank',
  rel: 'noopener noreferrer',
});

const row = (...cells) => {
  const tr = document.createElement('tr');
  cells.forEach(cell => {
    const td = document.createElement('td');
    td.append(...[].concat(cell));
    tr.append(td);
  });
  return tr;
};

const parse = text => text.trim().split('\n')
  .map(line => line.split('|').map(part => part.trim()))
  .filter(parts => parts[0]);

const games = parse(gamesList).map(([date, name = '', streams = '', ...note]) => ({
  date,
  name,
  streams: streams.split(/[\s,]+/).filter(Boolean),
  note: note.join(' | '),
}));

const credits = parse(creditsList).map(([role, name = '', url]) => ({ role, name, url }));

const byDate = [...games]
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((game, i) => ({ ...game, number: i + 1 }));

const byName = [...byDate]
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

const orders = { date: byDate, recent: [...byDate].reverse(), name: byName };
const sortButtons = [...document.querySelectorAll('.sort button')];
const gamesBody = document.getElementById('games-body');
const letterBar = document.getElementById('letters');
const perPage = document.getElementById('per-page');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
let order = 'date';
let page = 0;

const initial = name => {
  const letter = name.normalize('NFD').charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
};

const firstIndex = {};
byName.forEach((game, i) => firstIndex[initial(game.name)] ??= i);

const letterButtons = [...'#ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(letter => {
  const button = Object.assign(document.createElement('button'), {
    type: 'button',
    textContent: letter,
    disabled: !(letter in firstIndex),
  });
  button.addEventListener('click', () => {
    page = Math.floor(firstIndex[letter] / +perPage.value);
    showGames();
  });
  return button;
});
letterBar.append(...letterButtons);

const blankRow = () => Object.assign(row('\u00A0', '', '', '', ''), { ariaHidden: 'true' });

function showGames() {
  const list = orders[order];
  const size = +perPage.value;
  const pages = Math.max(1, Math.ceil(list.length / size));
  page = Math.min(page, pages - 1);
  const shown = list.slice(page * size, (page + 1) * size);

  gamesBody.replaceChildren(...shown.map(game => row(
    game.number,
    game.name,
    new Date(game.date).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }),
    game.streams.map(url => link(url.includes('list=') ? 'Open Playlist' : 'Open Stream', url)),
    game.note,
  )), ...Array.from({ length: size - shown.length }, blankRow));
  gamesBody.closest('.table-wrap').scrollTop = 0;

  sortButtons.forEach(button => button.classList.toggle('active', button.dataset.sort === order));
  letterBar.hidden = order !== 'name' || pages <= 3;
  const onPage = new Set(shown.map(game => initial(game.name)));
  letterButtons.forEach(button => button.classList.toggle('active', onPage.has(button.textContent)));
  document.getElementById('page-info').textContent = `Page ${page + 1} of ${pages}`;
  prev.disabled = page === 0;
  next.disabled = page === pages - 1;
}

sortButtons.forEach(button => button.addEventListener('click', () => {
  order = button.dataset.sort;
  page = 0;
  showGames();
}));
perPage.addEventListener('change', () => {
  page = 0;
  showGames();
});
prev.addEventListener('click', () => {
  page--;
  showGames();
});
next.addEventListener('click', () => {
  page++;
  showGames();
});

document.getElementById('count').textContent = `${games.length} / 1000`;
showGames();

document.getElementById('credits-body').replaceChildren(...credits.map(credit => row(
  credit.role,
  credit.url ? link(credit.name, credit.url) : credit.name,
)));

const el = (tag, className, ...children) => {
  const node = Object.assign(document.createElement(tag), { className });
  node.append(...children);
  return node;
};

function showProfile(id, name, text) {
  const facts = el('dl', 'facts');
  const bio = el('div', 'bio');
  const lists = el('div', 'lists');
  const links = el('div', 'links');
  let portrait;

  parse(text).forEach(([label, value = '']) => {
    const key = label.toLowerCase();
    if (key === 'image') {
      portrait = Object.assign(new Image(), { className: 'portrait', src: value, alt: name });
    } else if (key === 'description') {
      bio.append(el('p', '', value));
    } else if (key === 'likes' || key === 'dislikes') {
      const items = value.split(',').map(item => el('li', '', item.trim()));
      lists.append(el('div', '', el('h3', '', label), el('ul', '', ...items)));
    } else if (/^https?:\/\//i.test(value)) {
      links.append(link(label, value));
    } else {
      facts.append(el('div', '', el('dt', '', label), el('dd', '', value)));
    }
  });

  const intro = el('div', 'intro', ...[portrait, bio.hasChildNodes() && bio].filter(Boolean));
  document.getElementById(id).replaceChildren(...[intro, facts, lists, links].filter(node => node.hasChildNodes()));
}

showProfile('zapp-profile', 'Zapp Wattson', zappProfile);
showProfile('pixel-profile', 'Pixel', pixelProfile);

const modal = document.getElementById('contactModal');
document.querySelector('.email-trigger').addEventListener('click', () => modal.classList.add('open'));
document.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });
