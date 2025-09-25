# Icon Normalizer MVP

AI-powered SVG icon classification and deduplication tool with support for both cloud and local AI models.

## Features

- **Multi-AI Support**: OpenAI GPT-4 Vision (cloud) or Ollama (local)
- **AI Classification**: Advanced icon categorization using vision models
- **Duplicate Detection**: Finds exact and similar duplicates with configurable thresholds
- **Metadata Embedding**: Embeds classification results directly into SVG files
- **Batch Processing**: Process hundreds of icons efficiently with concurrency control
- **Local Execution**: Runs locally without complex infrastructure
- **Privacy-Friendly**: Use local models with Ollama for sensitive projects

## Installation

1. Clone and install dependencies:
```bash
cd icon-normalizer
yarn install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env file and add your OpenAI API key
```

3. Build the project:
```bash
yarn run build
```

## Quick Start

### Choose Your AI Provider

**Option 1: OpenAI (Cloud)**
```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your_key_here

# Process with OpenAI
yarn run dev process ./sample-icons --provider openai
```

**Option 2: Ollama (Local)**
```bash
# Install Ollama and download model
ollama pull llava

# Process with local AI
yarn run dev process ./sample-icons --provider ollama
```

**Check service availability:**
```bash
# Check OpenAI
yarn run dev check --provider openai

# Check Ollama
yarn run dev check --provider ollama
```

**Try with sample icons:**
```bash
# Process included sample icons
yarn run dev process ./sample-icons

# Or with custom options
yarn run dev process ./sample-icons --output ./processed --verbose --provider ollama
```

This will:
- Scan `./sample-icons` directory
- Detect duplicate icons
- Classify icons using AI
- Save results to `./processed` directory
- Generate a duplicate report

**Expected output:**
```
🚀 Starting icon processing...
Input directory: ./sample-icons
AI Provider: ollama

✅ Processing completed!
📊 Results:
  Total icons: 11
  Processed icons: 11
  Duplicate groups: 2
  Processing time: 15.23s
```

## Usage

### Process a directory of icons

```bash
# Basic usage
npm run dev process /path/to/icons

# Or after building
icon-normalizer process /path/to/icons

# With options
icon-normalizer process /path/to/icons \
  --output ./processed \
  --threshold 0.8 \
  --concurrent 3 \
  --verbose
```

### Available Options

- `-o, --output <dir>`: Output directory (default: ./processed)
- `--no-backup`: Skip creating backup
- `-t, --threshold <number>`: Similarity threshold (default: 0.8)
- `-c, --concurrent <number>`: Max concurrent AI requests (default: 3)
- `-v, --verbose`: Enable verbose output
- `--dry-run`: Preview without modifying files

### Show configuration

```bash
icon-normalizer config
```

## Output Structure

```
processed/
├── category1/
│   ├── icon1.svg
│   └── icon2.svg
├── category2/
│   └── icon3.svg
├── duplicates/
│   ├── duplicate1.svg
│   └── duplicate2.svg
└── duplicate-report.txt
```

## Embedded Metadata

Processed SVG files contain embedded metadata:

```xml
<!-- Icon Analysis Metadata -->
<!-- Category: navigation -->
<!-- Tags: arrow, right, next -->
<!-- Confidence: 0.95 -->
<!-- Processed: 2024-01-01T00:00:00.000Z -->
<!-- Version: 1.0.0 -->
<svg ...>
  <!-- SVG content -->
</svg>
```

## Categories

The tool recognizes the following categories:
- interface: navigation, actions, controls, input, output
- media: play, pause, volume, screen, camera
- action: add, remove, edit, save, delete, download, upload
- alert: warning, error, info, success, notification
- avatar: user, profile, person, people, face
- communication: email, phone, message, chat, call
- content: text, image, video, audio, file
- device: computer, mobile, tablet, tv, watch
- editor: bold, italic, underline, align, list
- file: folder, document, archive, attachment
- health: heart, medical, fitness, food
- image: photo, gallery, filter, crop
- location: map, pin, gps, direction
- maps: map, location, navigation, direction
- navigation: arrow, home, back, forward, up, down, left, right
- notification: bell, alert, message, warning
- social: share, like, comment, follow, heart
- text: font, size, color, format
- time: clock, calendar, date, timer
- transportation: car, bus, train, plane, bike
- travel: map, location, hotel, flight
- shopping: cart, bag, gift, tag
- sports: ball, trophy, medal, goal
- science: lab, atom, microscope, telescope
- education: book, graduation, school, pencil
- food: restaurant, coffee, pizza, drink
- emoji: smile, sad, laugh, cry, heart
- flags: country, language, region

## Development

```bash
# Development
npm run dev process ./test-icons

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Test
npm run test
```

## Requirements

- Node.js >= 18.0.0
- OpenAI API key
- Internet connection for AI analysis

## MVP Limitations

This MVP version focuses on core functionality:
- Local execution only (no Docker/APIs)
- File-based processing (no database)
- Basic duplicate detection
- Single command processing
- No advanced image preprocessing

Future versions may include:
- Web interface
- API endpoints
- Database integration
- Advanced similarity algorithms
- Custom category management