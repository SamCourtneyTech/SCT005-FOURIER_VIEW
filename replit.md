# Overview

This is a DFT (Discrete Fourier Transform) Audio Visualizer application that demonstrates how the DFT algorithm works by processing audio files and providing real-time visual feedback. The application is built as a full-stack web application with an Express.js backend and React frontend, designed to be educational and interactive for understanding digital signal processing concepts.

The core functionality includes audio file upload and playback, real-time audio analysis using Web Audio API, interactive DFT calculation visualization, spectrum analysis with customizable parameters, and support for both uploaded audio files and pre-loaded example audio samples.

# User Preferences

Preferred communication style: Simple, everyday language.
Layout preference: Unified vertical layout for both desktop and mobile (amplitude → inner functions → X[k] → frequency domain).
Visualization preference: Show empty visualizations on launch instead of grey sections until audio plays.

# System Architecture

## Frontend Architecture

The frontend is built using React with TypeScript, utilizing a component-based architecture with modern React patterns including hooks for state management and custom hooks for complex audio processing logic. The UI is styled using Tailwind CSS with shadcn/ui components providing a consistent design system.

Key architectural decisions include:
- **Unified Vertical Layout**: Single-column vertical layout for both desktop and mobile (Jan 2025) - amplitude over time → inner functions → X[k] summation → frequency domain
- **Empty State Visualizations**: Show visualization containers with empty canvases on launch instead of grey sections (Jan 2025)
- **Horizontal Scrolling Pattern**: Inner functions and X[k] sections show 3 items at once with horizontal scrolling for remaining items
- **Web Audio API Integration**: Direct browser audio processing for real-time analysis without server dependencies
- **Canvas-based Visualizations**: Custom canvas components for rendering time-domain, frequency-domain, and DFT calculation visualizations
- **Custom Hooks Pattern**: Separation of audio processing logic (`useAudioProcessor`) and DFT calculation logic (`useDFTCalculation`) into reusable hooks
- **Component Composition**: Modular components for different visualization sections (TimeDomainSection, SpectrumAnalyzer, DFTCalculationSection, SummationSection)

## Backend Architecture

The backend follows a layered Express.js architecture with clear separation of concerns:
- **Route Layer**: RESTful API endpoints for file operations and audio metadata management
- **Storage Layer**: Abstracted storage interface supporting both in-memory storage (for development) and database persistence
- **Object Storage Service**: Integration with Google Cloud Storage for file storage with access control

The backend uses TypeScript throughout and implements middleware for request logging and error handling.

## Data Storage Solutions

**Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations. The schema includes tables for users and audio files with proper relationships and constraints.

**File Storage**: Google Cloud Storage integration for audio file storage with a sophisticated access control system supporting different permission levels and group-based access policies.

**Development Storage**: In-memory storage implementation for local development and testing, allowing the application to run without external database dependencies.

## Authentication and Authorization

The application implements a flexible object-level access control system for audio files stored in Google Cloud Storage. The ACL (Access Control List) system supports:
- Multiple access group types (user lists, email domains, group membership, subscriptions)
- Granular permissions (read/write)
- Metadata-based policy storage

Currently, the authentication system appears to be in development with user schema defined but authentication middleware not yet implemented.

## File Upload and Processing

**Upload Strategy**: Direct-to-cloud uploads using presigned URLs to minimize server load and improve performance. The flow involves:
1. Client requests upload URL from backend
2. Backend generates presigned URL for Google Cloud Storage
3. Client uploads directly to cloud storage
4. Client notifies backend to save metadata

**File Processing**: Client-side audio processing using Web Audio API for decoding and analysis, eliminating server-side processing requirements and enabling real-time visualization.

# External Dependencies

## Cloud Services
- **Google Cloud Storage**: Primary file storage solution with integrated access control
- **Neon Database**: PostgreSQL hosting service (configured via DATABASE_URL)

## Frontend Libraries
- **React Ecosystem**: React 18 with TypeScript, React Query for state management, Wouter for routing
- **UI Framework**: shadcn/ui component library built on Radix UI primitives
- **Audio Processing**: Web Audio API (native browser support)
- **File Upload**: Uppy.js for enhanced file upload experience with progress tracking and preview

## Backend Libraries
- **Web Framework**: Express.js with TypeScript
- **Database**: Drizzle ORM with PostgreSQL driver (@neondatabase/serverless)
- **Validation**: Zod for runtime type validation and schema generation
- **Development**: Vite for frontend building, tsx for TypeScript execution

## Development Tools
- **Build System**: Vite with React plugin and custom Replit integrations
- **Type Safety**: TypeScript throughout the stack with shared type definitions
- **Database Management**: Drizzle Kit for schema migrations and database operations
- **Code Quality**: Tailwind CSS for consistent styling, PostCSS for CSS processing