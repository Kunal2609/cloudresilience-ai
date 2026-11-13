"""SQLAlchemy ORM models for CloudResilience AI."""
from datetime import datetime
import json
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class ArchitectureModel(Base):
    __tablename__ = "architectures"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    graph_json = Column(Text, nullable=False) # JSON serialization of VirtualArchitecture
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    simulations = relationship("SimulationRunModel", back_populates="architecture", cascade="all, delete-orphan")

class SimulationRunModel(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(64), primary_key=True, index=True)
    architecture_id = Column(String(64), ForeignKey("architectures.id", ondelete="SET NULL"), nullable=True)
    scenario_id = Column(String(100), nullable=False)
    initiating_resource_id = Column(String(100), nullable=False)
    parameters_json = Column(Text, default="{}")
    result_json = Column(Text, nullable=False) # JSON serialization of SimulationResult
    crrs_score = Column(Float, default=0.0)
    blast_radius_pct = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    architecture = relationship("ArchitectureModel", back_populates="simulations")

class ReportModel(Base):
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    simulation_run_id = Column(String(64), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String(50), default="technical") # "technical", "executive"
    content_markdown = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
