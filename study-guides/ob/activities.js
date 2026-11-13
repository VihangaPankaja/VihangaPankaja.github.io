/* Teaching cases illustrate the course frameworks; they do not assess real employees. */
const OB_CASES = {
  components: {
    choices: {cognition:'Cognition', affect:'Affect', intention:'Behavioural intention', behaviour:'Observed behaviour'},
    cases: {
      belief: ['A belief about the schedule', '“The rota changes every week,” says an employee. Which part is expressed?', 'cognition', 'Cognition concerns what the person believes. This statement describes a perceived fact about the rota.'],
      feeling: ['A feeling about the schedule', '“I feel frustrated by the rota.” Which part is expressed?', 'affect', 'Affect is the feeling or emotional part of the evaluation.'],
      plan: ['A planned response', '“I intend to ask for more predictable hours.” What is described?', 'intention', 'An intention is a plan to act. The statement does not establish that the conversation has happened.'],
      action: ['An observed response', 'The employee has already raised the issue with the supervisor. What is described?', 'behaviour', 'Raising the issue is an action. Keep observed conduct separate from a stated intention.']
    }
  },
  'person-situation': {
    choices: {strength:'Situation strength', activation:'Trait activation', insufficient:'Insufficient evidence', trait:'A relatively stable trait'},
    cases: {
      rules: ['Clear mandatory procedures', 'A tightly specified safety procedure leaves little discretion. What best explains why different employees act similarly?', 'strength', 'Strong situations make expected behaviour clear and constrain alternatives. Similar conduct here does not show identical personalities.'],
      cue: ['A trait-relevant cue', 'A reward-sensitive sales context makes differences in extraversion more relevant. Which concept names that relevance?', 'activation', 'Trait activation concerns cues that make a particular trait more relevant. The wider setting may still constrain its expression.'],
      single: ['One isolated action', 'A colleague says little in one meeting. Can this establish a personality trait?', 'insufficient', 'One action has several possible explanations. Look for a pattern across time and situations before making a trait inference.'],
      pattern: ['A repeated pattern', 'A person shows an organized, dependable pattern across years and several roles. What kind of description is better supported?', 'trait', 'A repeated pattern supports a relatively stable trait description. Stability still allows development and situational differences.']
    }
  },
  fit: {
    choices: {job:'Person–job fit', organization:'Person–organization fit', separate:'Assess the two fits separately'},
    cases: {
      tasks: ['Preferred activities and the job', 'The question is whether a person’s preferred activities match an occupation’s requirements. Which comparison is this?', 'job', 'Person–job fit compares the person with the job. The course uses Holland’s orientations to discuss this match.'],
      culture: ['Values and daily practices', 'A person values cooperation, but an employer routinely rewards internal rivalry. Which comparison is in question?', 'organization', 'Person–organization fit compares the person’s values/personality with organizational culture. Actual practices matter as well as stated values.'],
      both: ['Good task match, cultural mismatch', 'A person enjoys the job’s tasks but dislikes the employer’s culture. Must one overall fit label replace both observations?', 'separate', 'A person can fit the tasks yet fit the culture poorly. The comparison targets are different; neither establishes performance by itself.']
    }
  },
  'emotional-labour': {
    choices: {surface:'Surface acting', deep:'Deep acting', dissonance:'Emotional dissonance'},
    cases: {
      display: ['Change the display', 'An employee smiles for a customer while still feeling irritated. Which strategy changes the outward display?', 'surface', 'Surface acting changes the displayed emotion while the inner feeling remains different. A mismatch may also create dissonance.'],
      reframe: ['Change the felt emotion', 'An employee tries to understand a distressed customer’s position so that genuine sympathy replaces irritation. Which strategy is attempted?', 'deep', 'Deep acting tries to change the felt emotion to align with the required display. It is an attempt, not a guarantee that the feeling changes.'],
      mismatch: ['Name the mismatch', 'The question asks for the gap between what a person feels and what they show, rather than the strategy they use. What is the term?', 'dissonance', 'Emotional dissonance names the mismatch. Surface and deep acting describe different responses to display expectations.']
    }
  },
  techniques: {
    choices: {brainstorming:'Brainstorming', ngt:'Nominal group technique', interacting:'Interacting group'},
    cases: {
      free: ['Generate before criticizing', 'Members freely suggest ideas while criticism is deferred. Which technique is described?', 'brainstorming', 'Brainstorming encourages idea generation without immediate criticism. Deferred criticism does not mean that ideas never need evaluation.'],
      silent: ['Independent input and ranking', 'Members generate ideas silently, present them in turn, clarify them together, then rank them privately. Which technique is this?', 'ngt', 'NGT protects independent idea generation and uses private ranking after discussion. It is a structured process, not a meeting with no interaction.'],
      discussion: ['Ordinary group discussion', 'Members meet and discuss alternatives directly, using verbal and nonverbal interaction. Which format is this?', 'interacting', 'An interacting group discusses directly. The lecture’s comparison gives trade-offs rather than one universally best method.']
    }
  }
};

function initializeActivities(root) {
  root.querySelectorAll('[data-activity]').forEach(region => {
    const kind = region.dataset.activity;
    const feedback = region.querySelector('[data-feedback]');
    const definition = OB_CASES[kind];
    if (definition) {
      const select = region.querySelector('[data-case]');
      Object.entries(definition.cases).forEach(([key, item]) => {
        const option = document.createElement('option'); option.value = key; option.textContent = item[0]; select.append(option);
      });
      const render = () => {
        const item = definition.cases[select.value];
        region.querySelector('[data-scenario]').textContent = item[1];
        feedback.textContent = ''; feedback.removeAttribute('data-correct');
        const choices = region.querySelector('[data-choices]'); choices.replaceChildren();
        Object.entries(definition.choices).forEach(([key, label]) => {
          const button = document.createElement('button'); button.type = 'button'; button.dataset.answer = key;
          button.textContent = label; button.setAttribute('aria-pressed', 'false');
          button.addEventListener('click', () => {
            choices.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
            const correct = key === item[2]; feedback.dataset.correct = String(correct);
            feedback.textContent = `${correct ? 'Correct.' : 'Expected answer: ' + definition.choices[item[2]] + '.'} ${item[3]}`;
          });
          choices.append(button);
        });
      };
      select.addEventListener('change', render); render(); return;
    }
    const input = name => region.querySelector(`[data-input="${name}"]`).value;
    const result = (label, explanation) => {
      const output = region.querySelector('[data-result]'); output.dataset.label = label;
      output.textContent = `${label}. ${explanation}`;
    };
    const highlight = key => region.querySelectorAll('[data-cell]').forEach(cell => {
      if (cell.dataset.cell === key) cell.setAttribute('aria-current', 'true'); else cell.removeAttribute('aria-current');
    });
    const update = () => {
      if (kind === 'evln') {
        const key = input('action') + '-' + input('direction');
        const cells = {
          'active-constructive':['Voice','Raise a concern or propose an improvement.'],
          'active-destructive':['Exit','Leave or prepare to leave the organization.'],
          'passive-constructive':['Loyalty','Wait supportively for improvement.'],
          'passive-destructive':['Neglect','Allow effort or conditions to deteriorate.']
        };
        result(...cells[key]); highlight(key);
      } else if (kind === 'attribution') {
        const consensus=input('consensus'), distinctiveness=input('distinctiveness'), consistency=input('consistency');
        if ([consensus,distinctiveness,consistency].includes('unknown')) result('Insufficient evidence','Keep unknown cues unknown. Other people, other situations and other times require separate observations.');
        else if (consistency === 'low') result('Check temporary circumstances','The behaviour is unusual over time. Investigate what changed rather than assigning a stable cause.');
        else if (consensus === 'low' && distinctiveness === 'low') result('Internal attribution suggested','The pattern repeats for this person, across situations, while others respond differently. It suggests a person-related explanation; it does not prove one.');
        else if (consensus === 'high' && distinctiveness === 'high') result('External attribution suggested','Others respond similarly, and this person behaves differently elsewhere. The repeated pattern suggests a situation-related explanation; investigate it.');
        else result('Mixed evidence','The cues point in different directions. Seek context before settling on a cause.');
      } else if (kind === 'cohesion') {
        const key=input('norms')+'-'+input('cohesion');
        const labels={'high-high':'High productivity','high-low':'Productivity rises, but less','low-high':'Low productivity','low-low':'Low-to-moderate productivity'};
        result(labels[key],'This is the lecture’s qualitative model. Cohesion reinforces shared performance norms; it is not a numerical forecast.'); highlight(key);
      } else if (kind === 'team-check') {
        const answers=['better','purpose','interdependence'].map(input);
        if (answers.every(value => value === 'yes')) result('Consider a team','The work passes the three course questions. Effectiveness still depends on context, composition and process.');
        else result('Reconsider the team design','At least one course question is not satisfied. Consider individual work or coordination, or redesign the task before adding team costs.');
      }
    };
    region.querySelectorAll('select').forEach(select => select.addEventListener('change', update)); update();
  });
}
