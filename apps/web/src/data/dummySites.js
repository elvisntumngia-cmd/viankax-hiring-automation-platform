export const jobSites = [
  {
    id: 'northgate-mall',
    siteName: 'Northgate Mall',
    clientCustomerName: 'Northgate Retail Group',
    location: 'Atlanta, GA',
    address: '4100 Northgate Parkway',
    city: 'Atlanta',
    state: 'GA',
    requiredLicenseType: 'SO',
    requiredTraits: ['customer-facing', 'professional communication', 'incident reporting'],
    preferredTraits: ['retail security', 'de-escalation', 'evening availability'],
    siteNotes: 'High-traffic retail post with public interaction and clear reporting expectations.',
    status: 'Active',
    openShiftsCount: 2,
  },
  {
    id: 'madison-luxury-residences',
    siteName: 'Madison Luxury Residences',
    clientCustomerName: 'Madison Property Group',
    location: 'Atlanta, GA',
    address: '880 Madison Avenue',
    city: 'Atlanta',
    state: 'GA',
    requiredLicenseType: 'SO',
    requiredTraits: ['customer-facing', 'professional communication', 'incident reporting'],
    preferredTraits: ['concierge experience', 'day shift availability', 'professional tone'],
    siteNotes: 'Premium residential lobby post. Communication and presentation matter.',
    status: 'Active',
    openShiftsCount: 1,
  },
  {
    id: 'eastside-warehouse-patrol',
    siteName: 'Eastside Warehouse Patrol',
    clientCustomerName: 'Eastside Logistics',
    location: 'Atlanta, GA',
    address: '1290 Fulton Industrial Blvd',
    city: 'Atlanta',
    state: 'GA',
    requiredLicenseType: 'SO',
    requiredTraits: ['patrol experience', 'overnight availability', 'outdoor tolerance'],
    preferredTraits: ['warehouse security', 'incident reporting', 'reliable transportation'],
    siteNotes: 'Large perimeter patrol site with overnight coverage needs.',
    status: 'Active',
    openShiftsCount: 2,
  },
  {
    id: 'downtown-bank-post',
    siteName: 'Downtown Bank Post',
    clientCustomerName: 'Piedmont Bank',
    location: 'Charlotte, NC',
    address: '75 Trade Street',
    city: 'Charlotte',
    state: 'NC',
    requiredLicenseType: 'Armed',
    requiredTraits: ['armed experience', 'professional communication', 'incident reporting'],
    preferredTraits: ['bank post experience', 'supervisor experience', 'day shift availability'],
    siteNotes: 'Armed client-facing bank post with strict compliance requirements.',
    status: 'Active',
    openShiftsCount: 1,
  },
  {
    id: 'construction-site-patrol',
    siteName: 'Construction Site Patrol',
    clientCustomerName: 'Beacon Builders',
    location: 'Atlanta, GA',
    address: '520 Memorial Drive',
    city: 'Atlanta',
    state: 'GA',
    requiredLicenseType: 'SO',
    requiredTraits: ['outdoor tolerance', 'patrol experience', 'overnight availability'],
    preferredTraits: ['construction site experience', 'reliable transportation', 'incident reporting'],
    siteNotes: 'Outdoor night patrol post with equipment and perimeter checks.',
    status: 'Active',
    openShiftsCount: 1,
  },
]

export const openShifts = [
  {
    id: 'northgate-evening-part-time',
    siteId: 'northgate-mall',
    shiftTitle: 'Retail Security Officer - Evening',
    siteName: 'Northgate Mall',
    shiftType: 'Evening',
    employmentType: 'Part-time',
    daysNeeded: ['Thursday', 'Friday', 'Saturday', 'Sunday'],
    startTime: '4:00 PM',
    endTime: '12:00 AM',
    openPositions: 2,
    requiredLicenseType: 'SO',
    minimumExperience: '1 year security or public-facing experience',
    requiredTraits: ['customer-facing', 'professional communication', 'incident reporting'],
    preferredTraits: ['retail security', 'de-escalation'],
    urgency: 'Urgent',
    status: 'Open',
  },
  {
    id: 'madison-day-full-time',
    siteId: 'madison-luxury-residences',
    shiftTitle: 'Residential Lobby Officer - Day',
    siteName: 'Madison Luxury Residences',
    shiftType: 'Day',
    employmentType: 'Full-time',
    daysNeeded: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '7:00 AM',
    endTime: '3:00 PM',
    openPositions: 1,
    requiredLicenseType: 'SO',
    minimumExperience: '2 years customer-facing security preferred',
    requiredTraits: ['customer-facing', 'professional communication', 'incident reporting'],
    preferredTraits: ['concierge experience', 'day shift availability'],
    urgency: 'Normal',
    status: 'Open',
  },
  {
    id: 'eastside-overnight-patrol',
    siteId: 'eastside-warehouse-patrol',
    shiftTitle: 'Warehouse Patrol Officer - Overnight',
    siteName: 'Eastside Warehouse Patrol',
    shiftType: 'Overnight',
    employmentType: 'Full-time',
    daysNeeded: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '11:00 PM',
    endTime: '7:00 AM',
    openPositions: 2,
    requiredLicenseType: 'SO',
    minimumExperience: '1 year patrol experience preferred',
    requiredTraits: ['patrol experience', 'overnight availability', 'outdoor tolerance'],
    preferredTraits: ['warehouse security', 'incident reporting'],
    urgency: 'Critical',
    status: 'Open',
  },
  {
    id: 'downtown-bank-day-armed',
    siteId: 'downtown-bank-post',
    shiftTitle: 'Armed Bank Officer - Day',
    siteName: 'Downtown Bank Post',
    shiftType: 'Day',
    employmentType: 'Full-time',
    daysNeeded: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '8:00 AM',
    endTime: '5:00 PM',
    openPositions: 1,
    requiredLicenseType: 'Armed',
    minimumExperience: '3 years armed security or military/law enforcement',
    requiredTraits: ['armed experience', 'professional communication', 'incident reporting'],
    preferredTraits: ['bank post experience', 'supervisor experience'],
    urgency: 'Urgent',
    status: 'Open',
  },
  {
    id: 'construction-night-patrol',
    siteId: 'construction-site-patrol',
    shiftTitle: 'Construction Patrol Officer - Night',
    siteName: 'Construction Site Patrol',
    shiftType: 'Night',
    employmentType: 'Contract',
    daysNeeded: ['Friday', 'Saturday', 'Sunday'],
    startTime: '8:00 PM',
    endTime: '4:00 AM',
    openPositions: 1,
    requiredLicenseType: 'SO',
    minimumExperience: '6 months patrol or outdoor post experience',
    requiredTraits: ['outdoor tolerance', 'patrol experience', 'overnight availability'],
    preferredTraits: ['construction site experience', 'reliable transportation'],
    urgency: 'Normal',
    status: 'Open',
  },
]

export const placementRecommendations = {
  'john-carter': {
    bestMatch: 'northgate-evening-part-time',
    matchScore: 86,
    reason: 'Entry-level access control experience, evening availability, and public-facing comfort fit the retail evening post while license review completes.',
    strengths: ['customer-facing', 'evening availability', 'access control experience'],
    concerns: ['License still needs review', 'Resume score is still developing'],
    alternatives: [
      { shiftId: 'madison-day-full-time', score: 72 },
      { shiftId: 'construction-night-patrol', score: 68 },
      { shiftId: 'downtown-bank-day-armed', score: 28 },
    ],
  },
  'melissa-grant': {
    bestMatch: 'madison-day-full-time',
    matchScore: 94,
    reason: 'Strong communication, verified SO documentation, commercial property experience, and professional presentation fit a premium residential lobby post.',
    strengths: ['professional communication', 'customer-facing', 'incident reporting', 'verified license'],
    concerns: ['Confirm day shift preference before assignment'],
    alternatives: [
      { shiftId: 'northgate-evening-part-time', score: 88 },
      { shiftId: 'eastside-overnight-patrol', score: 81 },
      { shiftId: 'construction-night-patrol', score: 77 },
    ],
  },
  'david-brooks': {
    bestMatch: 'downtown-bank-day-armed',
    matchScore: 84,
    reason: 'Armed security background and patrol experience fit the bank post, but assignment should wait until license documentation is uploaded and verified.',
    strengths: ['armed experience', 'patrol experience', 'incident reporting'],
    concerns: ['License upload missing', 'Compliance hold blocks assignment'],
    alternatives: [
      { shiftId: 'eastside-overnight-patrol', score: 78 },
      { shiftId: 'construction-night-patrol', score: 74 },
      { shiftId: 'northgate-evening-part-time', score: 61 },
    ],
  },
  'angela-morris': {
    bestMatch: 'madison-day-full-time',
    matchScore: 79,
    reason: 'Strong reliability and communication would fit a customer-facing post, but this candidate is currently aligned to healthcare roles rather than security placement.',
    strengths: ['professional communication', 'reliability', 'verified documents'],
    concerns: ['Primary role is home healthcare', 'Security license context should be confirmed'],
    alternatives: [
      { shiftId: 'northgate-evening-part-time', score: 65 },
      { shiftId: 'eastside-overnight-patrol', score: 44 },
      { shiftId: 'downtown-bank-day-armed', score: 20 },
    ],
  },
}

export function findOpenShift(shiftId) {
  return openShifts.find((shift) => shift.id === shiftId)
}

export function findSite(siteId) {
  return jobSites.find((site) => site.id === siteId)
}

export function getJobSiteContext(job) {
  const shift = openShifts.find((item) => item.id === job.openShiftId)
    ?? openShifts.find((item) => item.shiftTitle.toLowerCase().includes(String(job.title ?? '').toLowerCase().split(' ')[0]))
  const site = shift ? findSite(shift.siteId) : jobSites.find((item) => item.location === job.location)

  return {
    site,
    shift,
  }
}

export function getPlacementRecommendation(applicant) {
  const directRecommendation = placementRecommendations[applicant.id]
  const byRoleRecommendation = Object.entries(placementRecommendations).find(([, recommendation]) => {
    const shift = findOpenShift(recommendation.bestMatch)
    return shift?.requiredLicenseType !== 'Armed' && String(applicant.role ?? '').toLowerCase().includes('security')
  })?.[1]
  const recommendation = directRecommendation ?? byRoleRecommendation ?? placementRecommendations['john-carter']
  const bestShift = findOpenShift(recommendation.bestMatch)
  const bestSite = bestShift ? findSite(bestShift.siteId) : null

  return {
    ...recommendation,
    bestShift,
    bestSite,
    alternatives: recommendation.alternatives.map((alternative) => {
      const shift = findOpenShift(alternative.shiftId)
      return {
        ...alternative,
        shift,
        site: shift ? findSite(shift.siteId) : null,
      }
    }),
  }
}
