# 1 System Architecture

This document provides a high-level overview of the 1 project architecture.

## Overview

1 is a molecular analysis platform that identifies chemical compounds from text descriptions or camera/image input and provides 3D visualizations.

## Core Components

The project is structured around a centralized Dependency Injection (DI) container in `src/core/services.js`.

### 1. Core Services (src/core)

- **ServiceContainer.js**: The custom DI container for service management.
- **ErrorHandler.js**: Centralized error classification and recovery logic.
- **PromptEngine.js**: Manages AI prompt templates and repairs malformed JSON.
- **MolecularPredictionService.js**: High-level orchestrator for chemical analysis.

### 2. Server (src/server)

- **Express.js API**: Thin controllers for request/response handling.
- **Services**: Domain-specific logic (SMILES processing, Pubchem resolution).
- **Routes**: Specialized API endpoints for molecular lookup and analysis.

### 3. Client (src/client)

- **React Application**: Modern SPA using hooks for state and API management.
- **MolecularColumn.jsx**: 3D visualization using molecular viewer libraries.
- **useApi.js**: Unified API client with caching and retry logic.


## Architecture Flow (Mermaid)

[```mermaid
flowchart TB
  subgraph Core
    CFG[Configuration]
    ERR[ErrorHandler]
    PENG[promptEngine]
    MAS�[MolecularAnalysisService]
  end

  subgraph Server
    API[Express API]
    NAME[NameResolver]
    PROC[MolecularProcessor]
  end

  API --> MAS
  MAS --> NAME
  MAS --> PROC
  MAS --> PENG
  MAS --> ERR
   MAS --> CFG
```]

## Engineering Principles

1.  **Dependency Inversion:** Higher-level modules (services) depend on abstractions (interfaces/ports) rather than concrete implementations (adapters).
2.  **Thin Controllers:** API routes only handle HTTP translation; all business logic lives in services/use-cases.
3.  **Single Responsibility:** Each class/module has a single, well-defined reason to change.
