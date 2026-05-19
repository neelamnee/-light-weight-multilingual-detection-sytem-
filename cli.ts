import { NLPEngine } from './src/lib/nlp-engine';

/**
 * shabdaAI CLI Utility
 * Usage: npx tsx cli.ts "Your text here"
 */

async function main() {
  const args = process.argv.slice(2);
  const input = args.join(' ');

  if (!input) {
    console.log('\n\x1b[36mshabdaAI CLI v2.0.1\x1b[0m');
    console.log('Usage: npx tsx cli.ts "kkrho broooo?"');
    console.log('\nOptions:');
    console.log('  --json    Output full debug object in JSON format');
    process.exit(0);
  }

  const isJson = args.includes('--json');
  const textToProcess = input.replace('--json', '').trim();

  const engine = new NLPEngine();
  const results = engine.processText(textToProcess);
  const normalized = results.map(r => r.normalized).join(' ');

  if (isJson) {
    console.log(JSON.stringify({
      input: textToProcess,
      output: normalized,
      breakdown: results
    }, null, 2));
  } else {
    console.log('\n\x1b[33mInput:\x1b[0m  ' + textToProcess);
    console.log('\x1b[32mOutput:\x1b[0m ' + normalized + '\n');
    
    // Performance Summary
    const changesCount = results.filter(p => p.type !== 'none' && p.type !== 'reduced').length;
    const avgConf = (results.reduce((acc, curr) => acc + curr.confidence, 0) / (results.length || 1)) * 100;
    
    console.log(`\x1b[90mProcessed ${results.length} tokens | ${changesCount} normalizations | ${avgConf.toFixed(1)}% confidence\x1b[0m\n`);
  }
}

main().catch(err => {
  console.error('\x1b[31mError:\x1b[0m', err.message);
  process.exit(1);
});
