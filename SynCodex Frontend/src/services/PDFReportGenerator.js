/**
 * PDF Report Generator
 * Creates professional interview assessment reports
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

class PDFReportGenerator {
  constructor() {
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 20;
    this.lineHeight = 7;
  }

  async generateReport(analysisData, interviewMetadata = {}) {
    const doc = new jsPDF();

    // Set fonts
    doc.setFont('helvetica');

    // Header
    this.addHeader(doc, interviewMetadata);

    // Scores Section
    doc.setFillColor(240, 240, 240);
    doc.rect(this.margin, doc.lastAutoTable?.finalY || 60, this.pageWidth - 2 * this.margin, 40, 'F');
    this.addScoresSection(doc, analysisData);

    // Detailed Analysis
    this.addAnalysisSection(doc, analysisData);

    // Strengths and Gaps
    this.addStrengthsGapsSection(doc, analysisData);

    // Tags (if any)
    if (interviewMetadata && interviewMetadata.tags && interviewMetadata.tags.length) {
      this.addTagsSection(doc, interviewMetadata.tags);
    }

    // Recommendations
    this.addRecommendationsSection(doc, analysisData);

    // Footer
    this.addFooter(doc);

    return doc.output('blob');
  }

  addHeader(doc, metadata) {
    // Title
    doc.setFontSize(24);
    doc.setTextColor(25, 51, 102);
    doc.text('Interview Assessment Report', this.margin, 25);

    // Subtitle and metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    let yPos = 35;

    if (metadata.candidateName) {
      doc.text(`Candidate: ${metadata.candidateName}`, this.margin, yPos);
      yPos += this.lineHeight;
    }
    if (metadata.interviewDate) {
      doc.text(`Date: ${new Date(metadata.interviewDate).toLocaleDateString()}`, this.margin, yPos);
      yPos += this.lineHeight;
    }
    if (metadata.interviewRole) {
      doc.text(`Position: ${metadata.interviewRole}`, this.margin, yPos);
      yPos += this.lineHeight;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(this.margin, yPos + 3, this.pageWidth - this.margin, yPos + 3);

    return yPos + 8;
  }

  addScoresSection(doc, data) {
    let yPos = doc.lastAutoTable?.finalY || 70;

    doc.setFontSize(12);
    doc.setTextColor(25, 51, 102);
    doc.text('Overall Assessment Scores', this.margin + 5, yPos + 8);

    yPos += 15;

    const scores = [
      {
        label: 'Technical Proficiency',
        score: data.technicalScore || 0,
        color: [59, 130, 246],
      },
      {
        label: 'Communication Quality',
        score: data.communicationScore || 0,
        color: [34, 197, 94],
      },
    ];

    scores.forEach((item, idx) => {
      const xStart = this.margin + 5 + idx * 80;

      // Score display
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`${item.label}:`, xStart, yPos);

      // Score bar
      const barWidth = 60;
      const barHeight = 8;
      const fillWidth = (item.score / 100) * barWidth;

      // Background bar
      doc.setDrawColor(220, 220, 220);
      doc.rect(xStart, yPos + 2, barWidth, barHeight);

      // Filled bar
      doc.setFillColor(...item.color);
      doc.rect(xStart, yPos + 2, fillWidth, barHeight, 'F');

      // Score text
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`${item.score}/100`, xStart + barWidth + 3, yPos + 6);
    });

    return yPos + 25;
  }

  addAnalysisSection(doc, data) {
    let yPos = doc.lastAutoTable?.finalY || 120;

    if (yPos > this.pageHeight - 60) {
      doc.addPage();
      yPos = this.margin;
    }

    doc.setFontSize(12);
    doc.setTextColor(25, 51, 102);
    doc.text('Summary Assessment', this.margin, yPos);

    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const summary = data.summary || 'No summary available.';
    const splitSummary = doc.splitTextToSize(summary, this.pageWidth - 2 * this.margin);

    doc.text(splitSummary, this.margin, yPos);
    yPos += splitSummary.length * 5 + 5;

    return yPos;
  }

  addStrengthsGapsSection(doc, data) {
    let yPos = doc.lastAutoTable?.finalY || 150;

    if (yPos > this.pageHeight - 80) {
      doc.addPage();
      yPos = this.margin;
    }

    // Strengths
    doc.setFontSize(11);
    doc.setTextColor(25, 51, 102);
    doc.text('Key Strengths', this.margin, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(34, 197, 94);

    (data.strengths || []).forEach((strength) => {
      doc.text(`• ${strength}`, this.margin + 5, yPos);
      yPos += 5;
    });

    yPos += 5;

    // Technical Gaps
    doc.setFontSize(11);
    doc.setTextColor(25, 51, 102);
    doc.text('Technical Gaps Identified', this.margin, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(239, 68, 68);

    (data.technicalGaps || []).forEach((gap) => {
      doc.text(`• ${gap}`, this.margin + 5, yPos);
      yPos += 5;
    });

    return yPos;
  }

  addRecommendationsSection(doc, data) {
    let yPos = doc.lastAutoTable?.finalY || 200;

    if (yPos > this.pageHeight - 60) {
      doc.addPage();
      yPos = this.margin;
    }

    doc.setFontSize(12);
    doc.setTextColor(25, 51, 102);
    doc.text('Recommendations', this.margin, yPos);

    yPos += 8;

    // Recommendation Status
    const statusColors = {
      hire: [34, 197, 94],
      'consider': [59, 130, 246],
      'continue_evaluation': [251, 146, 60],
      'feedback_needed': [239, 68, 68],
    };

    const recommendation = data.recommendation || 'continue_evaluation';
    const statusColor = statusColors[recommendation] || [0, 0, 0];

    doc.setFillColor(...statusColor);
    doc.setTextColor(255, 255, 255);
    doc.rect(this.margin, yPos, 60, 10, 'F');
    doc.text(`Recommendation: ${recommendation.replace('_', ' ').toUpperCase()}`, 
      this.margin + 3, yPos + 7);

    yPos += 15;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    (data.improvements || []).forEach((improvement) => {
      doc.text(`• ${improvement}`, this.margin, yPos);
      yPos += 5;
    });

    return yPos;
  }

  addTagsSection(doc, tags) {
    if (!tags || !tags.length) return;
    let yPos = doc.lastAutoTable?.finalY || 220;

    if (yPos > this.pageHeight - 60) {
      doc.addPage();
      yPos = this.margin;
    }

    doc.setFontSize(12);
    doc.setTextColor(25, 51, 102);
    doc.text('Quick Tags & Timestamps', this.margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    tags.forEach((t, idx) => {
      const time = t.ts ? new Date(t.ts).toLocaleTimeString() : '';
      const line = `${idx + 1}. ${t.label}${time ? ' — ' + time : ''}`;
      const split = doc.splitTextToSize(line, this.pageWidth - 2 * this.margin);
      doc.text(split, this.margin, yPos);
      yPos += split.length * 5 + 2;
      if (yPos > this.pageHeight - 40) {
        doc.addPage();
        yPos = this.margin;
      }
    });
  }

  addFooter(doc) {
    const yPos = this.pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated: ${new Date().toLocaleString()} | SynCodex Interview Assessment System`,
      this.margin,
      yPos
    );
    doc.text(`Page ${doc.internal.pages.length - 1}`, this.pageWidth - this.margin - 20, yPos);
  }

  downloadReport(blob, filename = 'interview_assessment.pdf') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default PDFReportGenerator;
