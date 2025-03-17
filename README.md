# ChessAnalyzer

<p align="center">
  <img src="public/CHESS ANALYZER (3).png" alt="ChessAnalyzer Logo" width="120"/>
</p>

<p align="center">
  Advanced chess game analysis platform powered by Stockfish
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#technologies">Technologies</a> •
  <a href="#screenshot">Screenshots</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

ChessAnalyzer is a sophisticated web application that provides professional-level chess game analysis. The platform enables chess players to analyze their games through Stockfish engine evaluation, offering move classification, strategic insights, and improvement suggestions.

## Features

- **Interactive Chess Board**
  - Visual arrows showing engine recommendations
  - Move navigation and board flip options
  - Sound effects for moves, captures, and other chess events

- **Deep Engine Analysis**
  - Stockfish integration with multiple evaluation lines
  - Customizable analysis depth (14-20 ply)
  - Visual evaluation bar showing advantage

- **Smart Move Classification**
  - AI-powered move quality ratings: Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Blunder
  - Detection of book moves and forced sequences
  - Opening recognition

- **Comprehensive Statistics**
  - Accuracy percentage for both players
  - Game flow visualization with evaluation graph
  - Summary of move classifications

- **Flexible Import Options**
  - Direct PGN text import
  - Chess.com account integration
  - Lichess.org account integration
  - Game browser for selecting recent games

- **Analysis Management**
  - Save analysis results as JSON
  - Client-side processing for privacy protection

## Demo

Visit [chessanalyzer.example.com](https://chessanalyzer.example.com) to see the application in action.

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/chess-analysis-app.git
   cd chess-analysis-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create Stockfish directory:
   ```bash
   mkdir -p public/scripts
   ```

4. Download Stockfish WASM:
   - Visit [Stockfish JS](https://github.com/nmrugg/stockfish.js/releases)
   - Download the latest stockfish.js WASM build
   - Place stockfish.js in the public/scripts directory

5. Start the development server:
   ```bash
   npm start
   ```

## Usage

### Analyzing a game

1. **Import a game**:
   - Paste PGN text directly in the analysis form, or
   - Connect to Chess.com or Lichess.org and select a game

2. **Configure analysis settings**:
   - Select depth (higher values provide more accurate analysis but take longer)
   - Click "Analyze Game" to begin the analysis process

3. **Navigate through the game**:
   - Use the arrow controls to step through moves
   - View engine evaluations and suggested alternatives 
   - See move classifications and accuracy statistics

4. **Save analysis results**:
   - Click "Save Report" to download the analysis as a JSON file
   - This file can be reloaded later for continued analysis

### Keyboard shortcuts

- **Left Arrow**: Previous move
- **Right Arrow**: Next move
- **Home**: Go to start
- **End**: Go to end
- **F**: Flip board orientation

## Technologies

- **React 19.0** - Frontend framework
- **Chess.js** - Chess logic and move validation
- **TailwindCSS** - Styling and responsive design
- **Stockfish** - Chess engine (WASM version)
- **Canvas API** - Interactive chess board rendering
- **Web Workers** - Non-blocking engine analysis

## Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/c0a2d4f7-2d81-4fd5-908a-dae59e27f84a" alt="Main Interface" width="80%"/>

</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/0247db29-3142-4548-b6bc-384de73fa5af" alt="Engine Analysis" width="80%"/>

</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/62f62000-a69a-4f5c-954a-23cd19971e05" alt="Move Classification" width="80%"/>
  <img src="https://github.com/user-attachments/assets/7e99410a-173a-427b-923b-b8cd2ef3e470" alt="Engine Suggestion" width="80%"/>


</p>

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please make sure your code follows the existing style and includes appropriate tests.

### Development Guidelines

- Use functional components with hooks
- Follow the established project structure
- Write tests for new features
- Ensure responsive design across devices

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Stockfish](https://stockfishchess.org/) for the amazing chess engine
- [Chess.js](https://github.com/jhlywa/chess.js) for chess logic implementation
- The chess community for feedback and suggestions
- Special thanks to contributors and testers

---

<p align="center">
  Made with ♟️ by <a href="https://github.com/yourusername">Muhammad Haikal Rahman</a>
</p>
