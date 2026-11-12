/* Small, local experiments. Reinitialized when the offline topic router replaces main. */
function initializeExplorers(root) {
  const number = value => Number(value.toFixed(4)).toString();
  root.querySelectorAll('[data-explorer]').forEach(explorer => {
    const input = name => explorer.querySelector(`[data-input="${name}"]`).value;
    const result = (name, value) => { explorer.querySelector(`[data-result="${name}"]`).textContent = value; };
    const metric = (name, value) => {
      const element = explorer.querySelector(`[data-metric="${name}"]`);
      element.dataset.number = String(value);
      element.textContent = number(value);
    };
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
        case 'implication': {
          const a = Number(input('a')), b = Number(input('b'));
          metric('implication-dienes', Math.max(1 - a, b));
          metric('implication-zadeh', Math.max(Math.min(a, b), 1 - a));
          metric('implication-lukasiewicz', Math.min(1, 1 - a + b));
          metric('implication-godel', a <= b ? 1 : b);
          metric('implication-min', Math.min(a, b));
          metric('implication-product', a * b);
          break;
        }
        case 'boundary': {
          const w1 = Number(input('w1')), w2 = Number(input('w2')), bias = Number(input('bias'));
          const gate = input('target');
          let correct = 0;
          rows('boundary-rows', [[0, 0], [0, 1], [1, 0], [1, 1]].map(([x1, x2], index) => {
            const target = gate === 'and' ? x1 * x2 : gate === 'or' ? Math.max(x1, x2) : Number(x1 !== x2);
            const net = w1 * x1 + w2 * x2 + bias, prediction = Number(net >= 0);
            const matches = target === prediction;
            if (matches) correct++;
            const point = explorer.querySelector(`[data-point="${index}"]`);
            point.setAttribute('fill', target ? 'var(--primary)' : 'var(--background)');
            point.setAttribute('stroke', matches ? 'var(--primary)' : 'var(--result)');
            point.setAttribute('stroke-width', matches ? '2' : '5');
            return [`(${x1}, ${x2})`, target, number(net), `${prediction} · ${matches ? 'match' : 'miss'}`];
          }));
          const line = explorer.querySelector('[data-line="boundary"]');
          line.hidden = w1 === 0 && w2 === 0;
          line.style.display = line.hidden ? 'none' : '';
          if (w2 !== 0) {
            const y = x => 220 - 140 * (-(w1 * x + bias) / w2);
            line.setAttribute('d', `M44,${y(-0.4)} L296,${y(1.4)}`);
          } else if (w1 !== 0) {
            const x = 100 + 140 * (-bias / w1);
            line.setAttribute('d', `M${x},24V276`);
          }
          metric('boundary-correct', correct);
          result('boundary', w1 === 0 && w2 === 0
            ? `Both weights are zero: all outputs are ${Number(bias >= 0)}. There is no unique separating line.`
            : 'A net input of exactly zero produces class 1. Compare each prediction with its target below.');
          break;
        }
        case 'adaline': {
          const weight = Number(input('weight')), rate = Number(input('rate')), target = Number(input('target'));
          const error = target - weight, loss = error ** 2 / 2;
          const correction = rate * error, next = weight + 2 * correction;
          metric('adaline-error', error); metric('adaline-loss', loss);
          metric('adaline-next', next); metric('adaline-next-loss', (target - next) ** 2 / 2);
          rows('adaline-update', [['Weight w', number(weight), number(correction), number(weight + correction)],
            ['Bias b', '0', number(correction), number(correction)]]);
          result('adaline', `The reported class is ${Number(weight >= 0) ? '+1' : '−1'}; the class is ${Number(weight >= 0) === Number(target === 1) ? 'correct' : 'wrong'}. Training still uses linear error ${number(error)}.`);
          break;
        }
        case 'gradient': {
          const v = Number(input('v')), w = Number(input('w')), target = Number(input('target')), rate = Number(input('rate'));
          const sigmoid = x => 1 / (1 + Math.exp(-x));
          const hidden = sigmoid(v), output = sigmoid(w * hidden);
          const deltaOutput = (target - output) * output * (1 - output);
          const deltaHidden = hidden * (1 - hidden) * w * deltaOutput;
          const parameters = [v, 0, w, 0], gradients = [-deltaHidden, -deltaHidden, -deltaOutput * hidden, -deltaOutput];
          const next = parameters.map((value, i) => value - rate * gradients[i]);
          const nextOutput = sigmoid(next[2] * sigmoid(next[0] + next[1]) + next[3]);
          ['v', 'bh', 'w', 'bo'].forEach((name, i) => metric('gradient-' + name, gradients[i]));
          metric('gradient-next-loss', (target - nextOutput) ** 2 / 2);
          rows('gradient-update', ['v', 'b hidden', 'w', 'b output'].map((name, i) =>
            [name, number(parameters[i]), number(-rate * gradients[i]), number(next[i])]));
          result('gradient', `Forward: hidden=${number(hidden)}, output=${number(output)}, E=${number((target - output) ** 2 / 2)}. Backward: δ output=${number(deltaOutput)}, δ hidden=${number(deltaHidden)}.`);
          break;
        }
        case 'clipping': {
          const alpha = Number(input('alpha'));
          const grade = x => x <= 3 ? x / 3 : (10 - x) / 7;
          const curve = transform => Array.from({length: 301}, (_, i) => {
            const x = i / 30;
            return `${i ? 'L' : 'M'}${30 + 28 * x},${190 - 140 * transform(grade(x))}`;
          }).join(' ');
          explorer.querySelector('[data-curve="clip"]').setAttribute('d', curve(value => Math.min(alpha, value)));
          explorer.querySelector('[data-curve="scale"]').setAttribute('d', curve(value => alpha * value));
          const clipArea = 10 * alpha - 5 * alpha ** 2;
          const clipMoment = 50 * alpha - 35 * alpha ** 2 + (20 / 3) * alpha ** 3;
          metric('clip-area', clipArea); metric('scale-area', 5 * alpha);
          if (alpha > 0) {
            metric('clip-centroid', clipMoment / clipArea); metric('scale-centroid', 13 / 3);
            result('clipping', `At original grade 0.8: clipping gives ${number(Math.min(alpha, 0.8))}; scaling gives ${number(alpha * 0.8)}.`);
          } else {
            ['clip-centroid', 'scale-centroid'].forEach(name => {
              const element = explorer.querySelector(`[data-metric="${name}"]`);
              element.textContent = 'undefined'; delete element.dataset.number;
            });
            result('clipping', 'Both output areas are zero. Both centroids are undefined.');
          }
          break;
        }
        case 'tsk': {
          const first = Number(input('first')), second = Number(input('second')), total = first + second;
          if (total === 0) {
            const element = explorer.querySelector('[data-metric="tsk-result"]');
            element.textContent = 'undefined'; delete element.dataset.number;
            result('tsk', 'No rule fires. The weighted average is undefined.');
            rows('tsk-weights', [['Rule 1', '0', 'undefined', '20'], ['Rule 2', '0', 'undefined', '30']]);
          } else {
            metric('tsk-result', (first * 20 + second * 30) / total);
            rows('tsk-weights', [['Rule 1', number(first), number(first / total), '20'],
              ['Rule 2', number(second), number(second / total), '30']]);
            result('tsk', `(${number(first)}×20 + ${number(second)}×30) ÷ ${number(total)}. The result stays between the active rule outputs.`);
          }
          break;
        }
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
    explorer.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
      const values = button.dataset.preset === 'product' ? [0.48, 0.2] : [0.6, 0.4];
      explorer.querySelector('[data-input="first"]').value = values[0];
      explorer.querySelector('[data-input="second"]').value = values[1];
      update();
    }));
    update();
  });
}
