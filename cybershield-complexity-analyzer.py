"""
CyberShield Cyclomatic Complexity Analyzer
Analyzes the complexity of threat severity determination algorithms
and classifies the threat analysis system itself based on its decision logic.
"""

import ast
import json
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from enum import Enum


class SystemThreatLevel(Enum):
    """System threat severity classification based on algorithm complexity"""
    CRITICAL = "CRITICAL"      # CC > 15 | Overly complex threat determination
    MEDIUM = "MEDIUM"          # CC 6-15  | Moderate algorithmic complexity
    LOW = "LOW"                # CC 1-5   | Simple, maintainable threat logic


@dataclass
class AlgorithmComplexityMetrics:
    """Container for threat determination algorithm complexity metrics"""
    cyclomatic_complexity: int
    nodes: int
    edges: int
    connected_components: int
    decision_branches: List[str]
    system_threat_level: SystemThreatLevel
    algorithm_reliability_score: float
    maintainability_risk_score: float
    threat_determination_confidence: float


class ThreatAlgorithmAnalyzer(ast.NodeVisitor):
    """
    Analyzes threat severity determination algorithms using AST
    to calculate Cyclomatic Complexity and assess algorithm quality
    """
    
    def __init__(self, algorithm_name: str = None):
        self.complexity = 1  # Base complexity
        self.decision_branches = []
        self.nodes = 1
        self.edges = 0
        self.algorithm_name = algorithm_name
        self.threat_evaluation_points = []
        
    def visit_If(self, node):
        """Each if statement in threat logic adds a decision point"""
        self.complexity += 1
        self.decision_branches.append({
            "type": "If condition",
            "line": node.lineno,
            "description": self._extract_condition_description(node)
        })
        self.edges += 2
        self.nodes += 1
        self.generic_visit(node)
        
    def visit_While(self, node):
        """While loops in threat evaluation add complexity"""
        self.complexity += 1
        self.decision_branches.append({
            "type": "While loop",
            "line": node.lineno,
            "description": "Iterative threat assessment"
        })
        self.edges += 2
        self.nodes += 1
        self.generic_visit(node)
        
    def visit_For(self, node):
        """For loops in threat scanning add complexity"""
        self.complexity += 1
        self.decision_branches.append({
            "type": "For loop",
            "line": node.lineno,
            "description": "Threat collection/iteration"
        })
        self.edges += 2
        self.nodes += 1
        self.generic_visit(node)
        
    def visit_ExceptHandler(self, node):
        """Exception handlers in threat logic add complexity"""
        self.complexity += 1
        self.decision_branches.append({
            "type": "Exception handler",
            "line": node.lineno,
            "description": "Threat handling branch"
        })
        self.edges += 1
        self.nodes += 1
        self.generic_visit(node)
        
    def visit_BoolOp(self, node):
        """Logical operators (and, or) in threat conditions add complexity"""
        self.complexity += len(node.values) - 1
        op_type = "AND" if isinstance(node.op, ast.And) else "OR"
        self.decision_branches.append({
            "type": f"Logical {op_type}",
            "line": node.lineno,
            "description": f"Combined threat evaluation ({op_type})"
        })
        self.nodes += len(node.values)
        self.edges += len(node.values) - 1
        self.generic_visit(node)
    
    @staticmethod
    def _extract_condition_description(node) -> str:
        """Extract readable description from condition node"""
        try:
            return ast.unparse(node.test) if hasattr(ast, 'unparse') else "Threat condition"
        except:
            return "Threat condition"


class ThreatDeterminationClassifier:
    """
    Classifies threat severity determination algorithms based on
    cyclomatic complexity and evaluates algorithm effectiveness
    """
    
    # Complexity thresholds for algorithm classification
    CRITICAL_THRESHOLD = 15    # Overly complex threat determination
    MEDIUM_THRESHOLD = 6       # Moderate complexity
    LOW_THRESHOLD = 1          # Simple, maintainable
    
    # Risk scoring weights for threat determination quality
    COMPLEXITY_WEIGHT = 0.35
    DECISION_WEIGHT = 0.35
    NESTING_WEIGHT = 0.30
    
    @staticmethod
    def classify_algorithm(complexity: int, decision_count: int, 
                          max_nesting_depth: int) -> Tuple[SystemThreatLevel, float, float]:
        """
        Classify threat determination algorithm quality
        
        Args:
            complexity: Cyclomatic Complexity of threat algorithm
            decision_count: Number of threat evaluation branches
            max_nesting_depth: Maximum nesting depth in threat logic
            
        Returns:
            Tuple of (SystemThreatLevel, maintainability_risk_score, confidence_score)
        """
        
        # Normalize metrics (0-1 scale)
        cc_normalized = min(complexity / 25, 1.0)
        decision_normalized = min(decision_count / 30, 1.0)
        nesting_normalized = min(max_nesting_depth / 10, 1.0)
        
        # Calculate maintainability risk (higher = worse maintainability)
        maintainability_risk = (
            (cc_normalized * ThreatDeterminationClassifier.COMPLEXITY_WEIGHT) +
            (decision_normalized * ThreatDeterminationClassifier.DECISION_WEIGHT) +
            (nesting_normalized * ThreatDeterminationClassifier.NESTING_WEIGHT)
        )
        
        # Calculate threat determination confidence (inverse of complexity)
        # Higher complexity = lower confidence in threat determination
        confidence_score = max(0, 1.0 - maintainability_risk)
        
        # Classify based on complexity thresholds
        if complexity > ThreatDeterminationClassifier.CRITICAL_THRESHOLD:
            threat_level = SystemThreatLevel.CRITICAL
        elif complexity >= ThreatDeterminationClassifier.MEDIUM_THRESHOLD:
            threat_level = SystemThreatLevel.MEDIUM
        else:
            threat_level = SystemThreatLevel.LOW
            
        return threat_level, maintainability_risk, confidence_score
    
    @staticmethod
    def calculate_algorithm_reliability(complexity: int, 
                                       decision_count: int,
                                       nesting_depth: int) -> float:
        """
        Calculate algorithm reliability score (0-100)
        Simpler threat determination = higher reliability
        """
        # Base reliability starts at 100
        base_reliability = 100
        
        # Deduct points for complexity
        cc_penalty = min((complexity / 25) * 30, 30)
        
        # Deduct points for decision branches
        decision_penalty = min((decision_count / 30) * 25, 25)
        
        # Deduct points for nesting depth
        nesting_penalty = min((nesting_depth / 10) * 20, 20)
        
        reliability = max(0, base_reliability - cc_penalty - decision_penalty - nesting_penalty)
        return round(reliability, 2)


class ThreatSeverityAlgorithmAnalyzer:
    """
    Main analyzer for threat severity determination algorithms.
    Analyzes how threats are classified and their decision logic complexity.
    """
    
    def __init__(self):
        self.algorithm_results = {}
        
    def analyze_threat_algorithm(self, algorithm_code: str, 
                                algorithm_name: str = None) -> AlgorithmComplexityMetrics:
        """
        Analyze a threat severity determination algorithm
        
        Args:
            algorithm_code: Python function code as string
            algorithm_name: Name of the threat determination algorithm
            
        Returns:
            AlgorithmComplexityMetrics with complexity analysis
        """
        try:
            tree = ast.parse(algorithm_code)
        except SyntaxError as e:
            raise ValueError(f"Invalid Python code: {e}")
        
        analyzer = ThreatAlgorithmAnalyzer(algorithm_name)
        analyzer.visit(tree)
        
        # Calculate nesting depth
        nesting_depth = self._calculate_nesting_depth(tree)
        
        # Classify algorithm
        system_threat_level, maintainability_risk, confidence = (
            ThreatDeterminationClassifier.classify_algorithm(
                analyzer.complexity,
                len(analyzer.decision_branches),
                nesting_depth
            )
        )
        
        # Calculate algorithm reliability
        reliability = ThreatDeterminationClassifier.calculate_algorithm_reliability(
            analyzer.complexity,
            len(analyzer.decision_branches),
            nesting_depth
        )
        
        metrics = AlgorithmComplexityMetrics(
            cyclomatic_complexity=analyzer.complexity,
            nodes=analyzer.nodes,
            edges=analyzer.edges,
            connected_components=1,
            decision_branches=analyzer.decision_branches,
            system_threat_level=system_threat_level,
            algorithm_reliability_score=reliability,
            maintainability_risk_score=maintainability_risk,
            threat_determination_confidence=confidence
        )
        
        if algorithm_name:
            self.algorithm_results[algorithm_name] = metrics
            
        return metrics
    
    def analyze_threat_module(self, file_path: str) -> Dict[str, AlgorithmComplexityMetrics]:
        """
        Analyze all threat determination algorithms in a Python module
        
        Args:
            file_path: Path to Python source file containing threat algorithms
            
        Returns:
            Dictionary mapping algorithm names to ComplexityMetrics
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            source_code = f.read()
        
        try:
            tree = ast.parse(source_code)
        except SyntaxError as e:
            raise ValueError(f"Invalid Python file {file_path}: {e}")
        
        results = {}
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                func_source = ast.get_source_segment(source_code, node)
                if func_source:
                    metrics = self.analyze_threat_algorithm(func_source, node.name)
                    results[node.name] = metrics
        
        return results
    
    @staticmethod
    def _calculate_nesting_depth(tree: ast.AST) -> int:
        """Calculate maximum nesting depth in threat algorithm"""
        max_depth = 0
        
        class DepthVisitor(ast.NodeVisitor):
            def __init__(self):
                self.current_depth = 0
                self.max_depth = 0
                
            def generic_visit(self, node):
                self.current_depth += 1
                self.max_depth = max(self.max_depth, self.current_depth)
                super().generic_visit(node)
                self.current_depth -= 1
        
        visitor = DepthVisitor()
        visitor.visit(tree)
        return visitor.max_depth
    
    def generate_algorithm_report(self, metrics: AlgorithmComplexityMetrics, 
                                 algorithm_name: str = "Unknown") -> Dict:
        """
        Generate comprehensive threat algorithm analysis report
        
        Args:
            metrics: AlgorithmComplexityMetrics object
            algorithm_name: Name of the threat algorithm
            
        Returns:
            Dictionary containing detailed algorithm assessment
        """
        report = {
            "algorithm_name": algorithm_name,
            "cyclomatic_complexity": metrics.cyclomatic_complexity,
            "system_threat_level": metrics.system_threat_level.value,
            "algorithm_reliability_score": metrics.algorithm_reliability_score,
            "maintainability_risk_score": round(metrics.maintainability_risk_score, 2),
            "threat_determination_confidence": round(metrics.threat_determination_confidence, 2),
            "decision_branches": len(metrics.decision_branches),
            "nesting_complexity": {
                "nodes": metrics.nodes,
                "edges": metrics.edges,
                "connected_components": metrics.connected_components
            },
            "algorithm_assessment": self._assess_algorithm_quality(metrics),
            "optimization_recommendations": self._get_optimization_recommendations(
                metrics.system_threat_level,
                metrics.cyclomatic_complexity
            ),
            "decision_branches_detail": metrics.decision_branches
        }
        return report
    
    def generate_json_report(self, metrics: AlgorithmComplexityMetrics, 
                            algorithm_name: str = "Unknown") -> str:
        """
        Generate JSON-formatted algorithm analysis report
        
        Args:
            metrics: AlgorithmComplexityMetrics object
            algorithm_name: Name of the threat algorithm
            
        Returns:
            JSON string of the report
        """
        report = self.generate_algorithm_report(metrics, algorithm_name)
        return json.dumps(report, indent=2, default=str)
    
    @staticmethod
    def _assess_algorithm_quality(metrics: AlgorithmComplexityMetrics) -> Dict:
        """
        Assess overall quality of threat determination algorithm
        
        Args:
            metrics: AlgorithmComplexityMetrics object
            
        Returns:
            Dictionary with quality assessment
        """
        return {
            "maintainability": "Poor" if metrics.maintainability_risk_score > 0.7 
                              else "Fair" if metrics.maintainability_risk_score > 0.4 
                              else "Good",
            "reliability": "High" if metrics.algorithm_reliability_score > 75 
                          else "Medium" if metrics.algorithm_reliability_score > 50 
                          else "Low",
            "confidence_in_threat_determination": round(metrics.threat_determination_confidence * 100, 1),
            "suitable_for_production": metrics.system_threat_level != SystemThreatLevel.CRITICAL
        }
    
    @staticmethod
    def _get_optimization_recommendations(threat_level: SystemThreatLevel, 
                                         complexity: int) -> List[str]:
        """
        Provide optimization recommendations for threat algorithm
        
        Args:
            threat_level: System threat level classification
            complexity: Cyclomatic complexity value
            
        Returns:
            List of specific recommendations
        """
        recommendations = []
        
        if threat_level == SystemThreatLevel.CRITICAL:
            recommendations.extend([
                "Refactor threat determination logic into smaller functions",
                "Extract complex decision logic into separate threat evaluation modules",
                "Implement decision tree or lookup table pattern for threat severity mapping",
                "Add unit tests for each threat classification branch",
                "Consider using rule engine or threat classification framework",
                "Document all threat determination paths"
            ])
        elif threat_level == SystemThreatLevel.MEDIUM:
            recommendations.extend([
                "Review threat determination branches for clarity",
                "Consider consolidating similar threat evaluation paths",
                "Add comprehensive logging for threat classification decisions",
                "Implement path coverage testing",
                "Document threat evaluation logic"
            ])
        else:
            recommendations.extend([
                "Maintain current algorithm structure",
                "Continue standard testing practices",
                "Document threat determination logic for maintainability"
            ])
        
        if complexity > 20:
            recommendations.append("Algorithm exceeds industry standard complexity limits")
        
        return recommendations
    
    def export_results_csv(self, output_file: str) -> None:
        """
        Export threat algorithm analysis to CSV file
        
        Args:
            output_file: Path to output CSV file
        """
        import csv
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Algorithm Name',
                'Cyclomatic Complexity',
                'System Threat Level',
                'Algorithm Reliability Score',
                'Maintainability Risk Score',
                'Threat Determination Confidence',
                'Decision Branches',
                'Nodes',
                'Edges'
            ])
            
            for algo_name, metrics in self.algorithm_results.items():
                writer.writerow([
                    algo_name,
                    metrics.cyclomatic_complexity,
                    metrics.system_threat_level.value,
                    metrics.algorithm_reliability_score,
                    metrics.maintainability_risk_score,
                    metrics.threat_determination_confidence,
                    len(metrics.decision_branches),
                    metrics.nodes,
                    metrics.edges
                ])
    
    def get_algorithms_by_threat_level(self, level: SystemThreatLevel) -> List[Tuple[str, AlgorithmComplexityMetrics]]:
        """
        Retrieve algorithms matching specific system threat level
        
        Args:
            level: SystemThreatLevel to filter by
            
        Returns:
            List of (algorithm_name, metrics) tuples
        """
        return [
            (name, metrics) 
            for name, metrics in self.algorithm_results.items() 
            if metrics.system_threat_level == level
        ]
    
    def get_critical_algorithms(self) -> List[Tuple[str, AlgorithmComplexityMetrics]]:
        """
        Get list of threat determination algorithms with CRITICAL complexity
        
        Returns:
            List of (algorithm_name, metrics) tuples for critical algorithms
        """
        return self.get_algorithms_by_threat_level(SystemThreatLevel.CRITICAL)
    
    def get_summary_statistics(self) -> Dict:
        """
        Generate summary statistics across all analyzed threat algorithms
        
        Returns:
            Dictionary containing aggregate metrics
        """
        if not self.algorithm_results:
            return {}
        
        complexities = [m.cyclomatic_complexity for m in self.algorithm_results.values()]
        reliabilities = [m.algorithm_reliability_score for m in self.algorithm_results.values()]
        threat_counts = {level: 0 for level in SystemThreatLevel}
        
        for metrics in self.algorithm_results.values():
            threat_counts[metrics.system_threat_level] += 1
        
        return {
            "total_algorithms_analyzed": len(self.algorithm_results),
            "average_complexity": round(sum(complexities) / len(complexities), 2),
            "max_complexity": max(complexities),
            "min_complexity": min(complexities),
            "average_reliability": round(sum(reliabilities) / len(reliabilities), 2),
            "threat_level_distribution": {
                level.value: count for level, count in threat_counts.items()
            },
            "critical_algorithms": len(self.get_critical_algorithms()),
            "algorithms_ready_for_production": sum(
                1 for m in self.algorithm_results.values()
                if m.system_threat_level != SystemThreatLevel.CRITICAL
            )
        }


if __name__ == '__main__':
    analyzer = ThreatSeverityAlgorithmAnalyzer()
    sample_code = '''
def determine_threat_score(event):
    score = 0
    if event['severity'] == 'high':
        score += 50
    if event['source_ip'].startswith('10.') or event['source_ip'].startswith('192.168.'):
        score += 20
    if event['risk_factor'] > 7:
        if event['known_attacker']:
            score += 30
        else:
            score += 15
    else:
        score += 5
    return score
'''

    metrics = analyzer.analyze_threat_algorithm(sample_code, 'sample_threat_algorithm')
    print(analyzer.generate_json_report(metrics, 'sample_threat_algorithm'))
