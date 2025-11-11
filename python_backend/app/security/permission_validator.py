"""
QuestKeeperAI - Permission Validator (3-Tier System from Roo Code)
Granular control over MCP tool access with conditions.
"""

import logging
from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class PermissionLevel(str, Enum):
    """Permission levels for tool access"""
    DENY = "deny"                          # Never allow
    REQUIRE_APPROVAL = "require_approval"  # Ask user each time
    AUTO_APPROVE = "auto_approve"          # Always allow (optionally with conditions)

@dataclass
class PermissionCondition:
    """Conditions for auto-approval"""
    parameter_ranges: Dict[str, tuple] = field(default_factory=dict)  # {"quantity": (1, 100)}
    allowed_values: Dict[str, List[Any]] = field(default_factory=dict)  # {"rarity": ["common", "uncommon"]}
    max_frequency: Optional[int] = None  # Max calls per minute
    allowed_hours: Optional[List[int]] = None  # Hours when allowed (24h format)
    require_character: bool = False  # Require active character
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "parameter_ranges": self.parameter_ranges,
            "allowed_values": self.allowed_values,
            "max_frequency": self.max_frequency,
            "allowed_hours": self.allowed_hours,
            "require_character": self.require_character
        }
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'PermissionCondition':
        return PermissionCondition(
            parameter_ranges=data.get('parameter_ranges', {}),
            allowed_values=data.get('allowed_values', {}),
            max_frequency=data.get('max_frequency'),
            allowed_hours=data.get('allowed_hours'),
            require_character=data.get('require_character', False)
        )

@dataclass
class ToolPermission:
    """Permission configuration for a specific tool"""
    tool_name: str
    server_name: str
    level: PermissionLevel
    reason: str = ""
    conditions: Optional[PermissionCondition] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "server_name": self.server_name,
            "level": self.level.value,
            "reason": self.reason,
            "conditions": self.conditions.to_dict() if self.conditions else None
        }
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'ToolPermission':
        conditions = None
        if data.get('conditions'):
            conditions = PermissionCondition.from_dict(data['conditions'])
        
        return ToolPermission(
            tool_name=data['tool_name'],
            server_name=data['server_name'],
            level=PermissionLevel(data['level']),
            reason=data.get('reason', ''),
            conditions=conditions
        )

@dataclass
class ValidationResult:
    """Result of permission validation"""
    allowed: bool
    reason: str = ""
    requires_approval: bool = False
    failed_conditions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "allowed": self.allowed,
            "reason": self.reason,
            "requires_approval": self.requires_approval,
            "failed_conditions": self.failed_conditions
        }

class PermissionValidator:
    """
    3-Tier permission system for MCP tool access
    
    Levels:
    - DENY: Tool is never allowed
    - REQUIRE_APPROVAL: User must explicitly approve each call
    - AUTO_APPROVE: Automatically allowed (optionally with conditions)
    """
    
    def __init__(self, config_path: str = None):
        from app.config import settings
        
        self.config_path = config_path or str(Path(settings.MCP_CONFIG_PATH).parent / "permissions.json")
        self.permissions: Dict[str, ToolPermission] = {}
        self.call_history: Dict[str, List[float]] = {}  # For rate limiting
        
        # Load permissions
        self.load_permissions()
    
    def load_permissions(self):
        """Load permissions from configuration file"""
        config_file = Path(self.config_path)
        
        if not config_file.exists():
            logger.info("No permissions config found, creating default")
            self._create_default_permissions()
            return
        
        try:
            with open(config_file, 'r') as f:
                data = json.load(f)
            
            for perm_data in data.get('permissions', []):
                perm = ToolPermission.from_dict(perm_data)
                key = f"{perm.server_name}/{perm.tool_name}"
                self.permissions[key] = perm
            
            logger.info(f"Loaded {len(self.permissions)} tool permissions")
        
        except Exception as e:
            logger.error(f"Error loading permissions: {e}")
    
    def _create_default_permissions(self):
        """Create default permission configuration"""
        config_file = Path(self.config_path)
        config_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Default D&D tool permissions
        default_permissions = {
            "permissions": [
                # Safe tools - auto approve
                {
                    "server_name": "rpg-tools",
                    "tool_name": "roll_dice",
                    "level": "auto_approve",
                    "reason": "Non-state-modifying, safe operation"
                },
                {
                    "server_name": "rpg-tools",
                    "tool_name": "get_ability_modifier",
                    "level": "auto_approve",
                    "reason": "Read-only calculation"
                },
                # Inventory - auto approve with conditions
                {
                    "server_name": "inventory",
                    "tool_name": "add_item",
                    "level": "auto_approve",
                    "reason": "Allowed with quantity/rarity limits",
                    "conditions": {
                        "parameter_ranges": {
                            "quantity": [1, 100]
                        },
                        "allowed_values": {
                            "rarity": ["common", "uncommon", "rare"]
                        }
                    }
                },
                {
                    "server_name": "inventory",
                    "tool_name": "remove_item",
                    "level": "auto_approve",
                    "reason": "Safe deletion"
                },
                # Quests - require approval
                {
                    "server_name": "quest",
                    "tool_name": "create_quest",
                    "level": "require_approval",
                    "reason": "Significant gameplay impact"
                },
                {
                    "server_name": "quest",
                    "tool_name": "complete_quest",
                    "level": "auto_approve",
                    "reason": "Completing quests is safe"
                },
                # Character modification - require approval
                {
                    "server_name": "character",
                    "tool_name": "modify_stats",
                    "level": "require_approval",
                    "reason": "Direct stat modification needs oversight"
                },
                {
                    "server_name": "character",
                    "tool_name": "add_experience",
                    "level": "auto_approve",
                    "reason": "XP gain is normal gameplay",
                    "conditions": {
                        "parameter_ranges": {
                            "amount": [1, 10000]
                        }
                    }
                },
                # Dangerous operations - deny
                {
                    "server_name": "character",
                    "tool_name": "delete_character",
                    "level": "deny",
                    "reason": "Too destructive, use UI instead"
                },
                # Filesystem - require approval for writes
                {
                    "server_name": "filesystem",
                    "tool_name": "read_file",
                    "level": "auto_approve",
                    "reason": "Read operations are safe"
                },
                {
                    "server_name": "filesystem",
                    "tool_name": "write_file",
                    "level": "require_approval",
                    "reason": "Writing files needs user consent"
                }
            ]
        }
        
        with open(config_file, 'w') as f:
            json.dump(default_permissions, f, indent=2)
        
        logger.info(f"Created default permissions at {self.config_path}")
        
        # Load the defaults we just created
        self.load_permissions()
    
    def validate(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict[str, Any],
        character_id: Optional[str] = None,
        user_approved: bool = False
    ) -> ValidationResult:
        """
        Validate if a tool call should be allowed
        
        Args:
            server_name: MCP server name
            tool_name: Tool being called
            arguments: Tool arguments
            character_id: Active character ID (if any)
            user_approved: Whether user explicitly approved this call
        
        Returns:
            ValidationResult with decision and reasoning
        """
        # Get permission for this tool
        permission = self.get_permission(server_name, tool_name)
        
        # DENY level - never allow
        if permission.level == PermissionLevel.DENY:
            return ValidationResult(
                allowed=False,
                reason=permission.reason or "Tool access denied by policy"
            )
        
        # REQUIRE_APPROVAL level - need user approval
        if permission.level == PermissionLevel.REQUIRE_APPROVAL:
            if not user_approved:
                return ValidationResult(
                    allowed=False,
                    requires_approval=True,
                    reason=permission.reason or "User approval required"
                )
            # User approved, allow it
            return ValidationResult(
                allowed=True,
                reason="Approved by user"
            )
        
        # AUTO_APPROVE level - check conditions
        if permission.level == PermissionLevel.AUTO_APPROVE:
            # No conditions - allow immediately
            if not permission.conditions:
                return ValidationResult(
                    allowed=True,
                    reason="Auto-approved (no conditions)"
                )
            
            # Check conditions
            condition_check = self.check_conditions(
                arguments,
                permission.conditions,
                character_id,
                server_name,
                tool_name
            )
            
            if condition_check.allowed:
                return ValidationResult(
                    allowed=True,
                    reason="Auto-approved (conditions met)"
                )
            else:
                return ValidationResult(
                    allowed=False,
                    reason=f"Conditions not met: {', '.join(condition_check.failed_conditions)}",
                    failed_conditions=condition_check.failed_conditions
                )
        
        # Shouldn't reach here
        return ValidationResult(
            allowed=False,
            reason="Invalid permission level"
        )
    
    def check_conditions(
        self,
        arguments: Dict[str, Any],
        conditions: PermissionCondition,
        character_id: Optional[str],
        server_name: str,
        tool_name: str
    ) -> ValidationResult:
        """Check if arguments meet permission conditions"""
        failed = []
        
        # Check parameter ranges
        for param, (min_val, max_val) in conditions.parameter_ranges.items():
            if param in arguments:
                value = arguments[param]
                if not (min_val <= value <= max_val):
                    failed.append(f"{param} must be between {min_val} and {max_val}")
        
        # Check allowed values
        for param, allowed in conditions.allowed_values.items():
            if param in arguments:
                value = arguments[param]
                if value not in allowed:
                    failed.append(f"{param} must be one of: {', '.join(map(str, allowed))}")
        
        # Check character requirement
        if conditions.require_character and not character_id:
            failed.append("Active character required")
        
        # Check rate limiting
        if conditions.max_frequency:
            if not self._check_rate_limit(server_name, tool_name, conditions.max_frequency):
                failed.append(f"Rate limit exceeded (max {conditions.max_frequency}/min)")
        
        # Check time restrictions
        if conditions.allowed_hours:
            from datetime import datetime
            current_hour = datetime.now().hour
            if current_hour not in conditions.allowed_hours:
                failed.append(f"Tool only allowed during hours: {conditions.allowed_hours}")
        
        if failed:
            return ValidationResult(
                allowed=False,
                failed_conditions=failed
            )
        
        return ValidationResult(allowed=True)
    
    def _check_rate_limit(self, server_name: str, tool_name: str, max_per_minute: int) -> bool:
        """Check if rate limit is exceeded"""
        import time
        
        key = f"{server_name}/{tool_name}"
        current_time = time.time()
        
        # Initialize if not exists
        if key not in self.call_history:
            self.call_history[key] = []
        
        # Remove calls older than 1 minute
        self.call_history[key] = [
            t for t in self.call_history[key]
            if current_time - t < 60
        ]
        
        # Check if exceeded
        if len(self.call_history[key]) >= max_per_minute:
            return False
        
        # Record this call
        self.call_history[key].append(current_time)
        return True
    
    def get_permission(self, server_name: str, tool_name: str) -> ToolPermission:
        """Get permission for a tool (or create default)"""
        key = f"{server_name}/{tool_name}"
        
        if key not in self.permissions:
            # Default to REQUIRE_APPROVAL for safety
            logger.warning(f"No permission configured for {key}, defaulting to REQUIRE_APPROVAL")
            self.permissions[key] = ToolPermission(
                tool_name=tool_name,
                server_name=server_name,
                level=PermissionLevel.REQUIRE_APPROVAL,
                reason="No permission configured, requires approval by default"
            )
        
        return self.permissions[key]
    
    def set_permission(
        self,
        server_name: str,
        tool_name: str,
        level: PermissionLevel,
        reason: str = "",
        conditions: Optional[PermissionCondition] = None
    ) -> ToolPermission:
        """Set or update permission for a tool"""
        permission = ToolPermission(
            tool_name=tool_name,
            server_name=server_name,
            level=level,
            reason=reason,
            conditions=conditions
        )
        
        key = f"{server_name}/{tool_name}"
        self.permissions[key] = permission
        
        # Save to config
        self.save_permissions()
        
        return permission
    
    def save_permissions(self):
        """Save permissions to configuration file"""
        try:
            data = {
                "permissions": [
                    perm.to_dict()
                    for perm in self.permissions.values()
                ]
            }
            
            with open(self.config_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Saved {len(self.permissions)} permissions")
        
        except Exception as e:
            logger.error(f"Error saving permissions: {e}")
    
    def get_all_permissions(self) -> List[ToolPermission]:
        """Get all configured permissions"""
        return list(self.permissions.values())
    
    def get_permissions_by_level(self, level: PermissionLevel) -> List[ToolPermission]:
        """Get all permissions of a specific level"""
        return [
            perm for perm in self.permissions.values()
            if perm.level == level
        ]
