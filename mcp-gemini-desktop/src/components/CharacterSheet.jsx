import React, { useState } from 'react';
import './CharacterSheet.css';

const ABILITY_NAMES = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA'
};

export function CharacterSheet({ character }) {
  const [expanded, setExpanded] = useState(false);

  if (!character) {
    return (
      <div className="character-sheet empty">
        <p>No active character</p>
      </div>
    );
  }

  const getModifier = (score) => Math.floor((score - 10) / 2);
  const getShortName = (fullName) => fullName.split(' ')[0];

  return (
    <div className="character-sheet" data-expanded={expanded}>
      <header
        className="sheet-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="header-left">
          <h3 className="character-name">{character.name}</h3>
          <span className="character-class">{character.character_class}</span>
        </div>
        <div className="header-right">
          <span className="level">Level {character.level}</span>
          <button className="toggle-btn">
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </header>

      {expanded && (
        <div className="sheet-body">
          {/* Vitals Section */}
          <div className="vitals-section">
            <div className="vital">
              <label>HP</label>
              <div className="hp-bar">
                <div
                  className="hp-fill"
                  style={{
                    width: `${(character.hit_points_current / character.hit_points_max) * 100}%`
                  }}
                ></div>
              </div>
              <span>{character.hit_points_current}/{character.hit_points_max}</span>
            </div>
            <div className="vital">
              <label>AC</label>
              <span className="ac-value">{character.armor_class}</span>
            </div>
          </div>

          {/* Ability Scores Grid */}
          <div className="abilities-grid">
            {character.ability_scores && Object.entries(character.ability_scores).map(([ability, score]) => (
              ability !== 'character_id' && (
                <div key={ability} className="ability-box">
                  <span className="ability-name">{ABILITY_NAMES[ability] || ability}</span>
                  <span className="ability-score">{score}</span>
                  <span className="ability-mod">
                    {getModifier(score) >= 0 ? '+' : ''}{getModifier(score)}
                  </span>
                </div>
              )
            ))}
          </div>

          {/* Skills Section */}
          <div className="skills-section">
            <h4>Skills</h4>
            <div className="skills-list">
              {character.skills && character.skills.map((skill, idx) => (
                <div key={idx} className="skill-item">
                  <span>{skill.name}</span>
                  <span className="skill-bonus">
                    {skill.proficient ? '🟢' : '⚪'} {skill.modifier >= 0 ? '+' : ''}{skill.modifier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
