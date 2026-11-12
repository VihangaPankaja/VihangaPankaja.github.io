/* Small, local experiments. Reinitialized when the offline topic router replaces main. */
function initializeExplorers(root) {
  const number = value => Number(value.toFixed(4)).toString();
  root.querySelectorAll('[data-explorer]').forEach(explorer => {
    const input = name => explorer.querySelector(`[data-input="${name}"]`).value;
    const result = (name, value) => { explorer.querySelector(`[data-result="${name}"]`).textContent = value; };
    const rows = (name, values) => {
      const body = explorer.querySelector(`[data-result="${name}"]`);
      const headings = [...body.closest('table').querySelectorAll('thead th')];
      body.replaceChildren(...values.map(values => {
        const row = document.createElement('tr');
        values.forEach((value, index) => {
          const cell = document.createElement(index === 0 ? 'th' : 'td');
          if (index === 0) cell.scope = 'row';
          else cell.dataset.label = headings[index].textContent;
          cell.textContent = value; row.append(cell);
        });
        return row;
      }));
    };
    const update = () => {
      explorer.querySelectorAll('[data-value]').forEach(output => {
        output.textContent = input(output.dataset.value);
      });
      switch (explorer.dataset.explorer) {
        case 'neuron': {
          const bias = Number(input('bias')), net = -3.5 + bias;
          result('neuron', `−3.5 + (${number(bias)}) = ${number(net)} → output ${net >= 0 ? 1 : 0}`);
          break;
        }
        case 'kernel': {
          const sigma = Number(input('sigma'));
          const response = distance => Math.exp(-(distance ** 2) / (2 * sigma ** 2));
          const path = Array.from({length: 121}, (_, i) => {
            const distance = -3 + i / 20;
            return `${i ? 'L' : 'M'}${50 + i * 560 / 120},${200 - 160 * response(distance)}`;
          }).join(' ');
          explorer.querySelector('[data-curve="kernel"]').setAttribute('d', path);
          result('kernel', `At distance 1: relative response = ${number(response(1))}. At the exemplar: 1.`);
          break;
        }
        case 'relation': {
          const R = [[0.7, 0.5, 0.1], [0.8, 0.4, 0.6]];
          const S = [[0.9, 0.6], [0.1, 0.7], [0.5, 0.3]];
          const [row, column] = input('cell').split(',').map(Number);
          const min = input('method') === 'min';
          const routes = R[row].map((link, i) => min ? Math.min(link, S[i][column]) : link * S[i][column]);
          rows('routes', routes.map((value, i) => [`via y${i + 1}`, R[row][i], S[i][column], number(value)]));
          result('relation', `T(x${row + 1},z${column + 1}) = max(${routes.map(number).join(', ')}) = ${number(Math.max(...routes))}`);
          break;
        }
        case 'cut': {
          const level = Number(input('level')), weak = input('kind') === 'weak';
          const grades = [0, 0.4, 0.7, 0.9], included = [];
          const points = grades.map((grade, i) => {
            const keep = weak ? grade >= level : grade > level;
            if (keep) included.push(i + 1);
            const point = document.createElement('span');
            point.className = 'grade-point' + (keep ? ' included' : '');
            point.textContent = `x=${i + 1}`;
            const label = document.createElement('small');
            label.textContent = `μ=${grade} · ${keep ? 'in' : 'out'}`;
            point.append(label); return point;
          });
          explorer.querySelector('[data-result="cut-points"]').replaceChildren(...points);
          result('cut', `${weak ? 'Weak' : 'Strong'} cut = ${included.length ? '{' + included.join(', ') + '}' : '∅'}`);
          break;
        }
        case 'hedge': {
          const grade = Number(input('grade'));
          rows('hedge', [
            ['Original', 'μ', number(grade)],
            ['Very', 'μ²', number(grade ** 2)],
            ['More or less', '√μ', number(Math.sqrt(grade))],
            ['Very very', 'μ⁴', number(grade ** 4)]
          ]);
          break;
        }
      }
    };
    explorer.addEventListener('input', update);
    update();
  });
}
