from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.endpoints.architectures import get_architecture, save_or_update_architecture
from app.db.database import Base
from app.schemas.models import ResourceType, VirtualArchitecture, VirtualResource


def test_custom_architecture_round_trips_and_increments_revision():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        architecture = VirtualArchitecture(
            id="custom-architecture-test",
            name="User-built architecture",
            resources=[VirtualResource(id="custom-db", name="Primary-DB", type=ResourceType.DATABASE)],
        )
        first = save_or_update_architecture(architecture, session)
        first.resources[0].name = "Production-DB"
        second = save_or_update_architecture(first, session)
        restored = get_architecture(architecture.id, session)

        assert second.version == 2
        assert restored.version == 2
        assert restored.resources[0].name == "Production-DB"
    finally:
        session.close()
        engine.dispose()
