import React, { Component } from 'react'
import Box from '@material-ui/core/Box'
import styled from 'styled-components'
import Typography from '@material-ui/core/Typography'
import Grid from '@material-ui/core/Grid'
import Breadcrumbs from '@material-ui/core/Breadcrumbs'
import Avatar from '@material-ui/core/Avatar'
import NavigateNextIcon from '@material-ui/icons/NavigateNext'
import { UnstyledLink } from 'components/atoms/Link'
import { PeopleAvatar } from 'components/atoms/Avatar'
import ScrollableTabs from 'components/organisms/ScrollableTabs'
import gql from 'graphql-tag'
import { Query } from 'react-apollo'
import { getColorFromCamp } from 'utils/helper'
import CouncillorMeetingAttendanceContainer from 'components/containers/CouncillorMeetingAttendanceContainer'
import PersonElectionHistoriesContainer from 'components/containers/PersonElectionHistoriesContainer'
import FCPersonData from 'components/templates/FCPersonData'
import { COLORS } from 'ui/theme'
import { Tag } from 'components/atoms/Tag'
import {
  getDistrictOverviewUriFromTag,
  getConstituencyUriFromTag,
} from 'utils/helper'

// TODO: add age, camp & related_organization
const GET_PEOPLE_PROFILE = gql`
  query($uuid: uuid!) {
    dcd_people(where: { uuid: { _eq: $uuid } }) {
      id
      uuid
      fc_uuid
      name_zh
      name_en
      gender
      related_organization
      estimated_yob
      councillors {
        meeting_attendances {
          id
        }
        year
        cacode
        term_from
        term_to
        career
        district {
          dc_name_zh
          dc_code
        }
        political_affiliation
        post
        constituency {
          id
          year
          name_zh
        }
      }
      candidates {
        constituency {
          name_zh
          code
          district {
            dc_name_zh
            dc_code
          }
        }
        candidate_number
        is_won
        fb_id
        occupation
        political_affiliation
        age
        cacode
        camp
        election_type
        year
        votes
      }
    }
  }
`

const FlexRowContainer = styled(Box)`
  && {
    width: 100%;
  }
`

const CandidateHeaderContainer = styled(FlexRowContainer)`
  && {
    height: 116px;
    position: relative;
    display: flex;
    background: linear-gradient(
      ${props => COLORS.camp[props.camp].background} 84px,
      rgba(255, 255, 255, 0) 32px
    );
  }
`

const CandidateAvatorContainer = styled(Box)`
  && {
    position: absolute;
    left: 16px;
    bottom: 8px;
  }
`

const PersonName = styled.div`
  && {
    position: absolute;
    left: 116px;
    top: 32px;
    color: ${props => COLORS.camp[props.camp].text};
  }
`

const ElectionStatus = styled(Box)`
  && {
    display: flex;
    flex-direction: row-reverse;
    width: 100%;
    div {
      margin: 8px 8px 0 0;
    }
  }
`

const FacebookPageButton = styled(UnstyledLink)`
  && {
    display: block;
    position: relative;
    width: 0px;
    height: 0px;
    right: 40px;
    bottom: -50px;
    img {
      height: 16px;
      width: 16px;
    }
  }
`

const PersonHighlightContainer = styled(FlexRowContainer)`
  && {
    padding: 16px;
  }
`
const BreadcrumbsContainer = styled(Box)`
  && {
    flex-grow: 1;
    padding: 4px 16px;
  }
`

class ProfilePage extends Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  async componentDidMount() {}

  handleElectionDetailButton = (year, code) => {
    this.props.history.push(`/district/${year}/${code}`)
  }

  renderFacebook = person => {
    let url = 'https://fb.me/'
    let fb_id = person.candidates[0].fb_id
    if (fb_id && fb_id !== 'n/a') {
      url += fb_id
      return (
        <FacebookPageButton target="_blank" href={url} aria-label="Facebook">
          <Avatar
            width={'8px'}
            height={'8px'}
            borderwidth={'0'}
            src={`/static/images/facebook.svg`}
          />
        </FacebookPageButton>
      )
    }
    return
  }

  renderIntroText = (person, currentTerm) => {
    let text
    if (
      currentTerm &&
      currentTerm.term_to &&
      Date.parse(new Date()) < Date.parse(currentTerm.term_to)
    ) {
      text = `現任${currentTerm.district.dc_name_zh}區議員（${currentTerm.constituency.name_zh}）`
    } else {
      const electionResult = person.candidates[0].is_won ? '當選' : '參選'
      text = `${electionResult}${person.candidates[0].year}年${person.candidates[0].constituency.district.dc_name_zh}區議員（${person.candidates[0].constituency.name_zh}）`
    }

    return <Typography variant="h6">{text}</Typography>
  }

  renderElectionStatusText = (person, currentTerm) => {
    let tags = []
    let primaryText

    if (
      person.candidates[0].year === 2019 &&
      person.candidates[0].election_type === 'ordinary'
    ) {
      if (currentTerm) {
        primaryText = '競逐連任'
      } else if (person.candidates.length === 1) {
        primaryText = '首度參選'
      } else if (person.candidates.length > 1) {
        if (
          !person.candidates.find(p => p.is_won) &&
          person.candidates.length > 2
        ) {
          primaryText = '屢敗屢戰'
        } else if (!person.candidates[1].is_won) {
          primaryText = '捲土重來'
        }
      }
    }

    if (primaryText) tags.push(primaryText)

    if (person.candidates.length > 1) {
      if (person.candidates[1].is_won && person.candidates[1].votes === 0) {
        tags.push('上屆自動當選')
      }

      if (person.candidates[0].cacode[0] !== person.candidates[1].cacode[0]) {
        tags.push('跨區參選')
      }
    }

    if (tags.length > 0) {
      return (
        <ElectionStatus>
          {tags.map(tag => (
            <Tag
              textcolor="black"
              value={tag}
              borderwidth={1}
              backgroundcolor={'transparent'}
            />
          ))}
        </ElectionStatus>
      )
    }

    return null
  }

  render() {
    const {
      match: {
        params: { uuid },
      },
    } = this.props

    const homeUrl = process.env.REACT_APP_HOST_URI

    return (
      <Query query={GET_PEOPLE_PROFILE} variables={{ uuid }}>
        {({ loading, error, data }) => {
          if (loading) return null
          if (error) return `Error! ${error}`
          const person = data.dcd_people[0]

          const currentTerm =
            person.councillors &&
            person.councillors[person.councillors.length - 1]
          const lastElection =
            person.candidates &&
            person.candidates.sort((a, b) => {
              if (b.year > a.year) return 1
              else if (b.year < a.year) return -1
              else {
                if (
                  b.election_type === 'ordinary' &&
                  a.election_type === 'by-election'
                )
                  return 1
                else return -1
              }
            })[0]
          const hasMeetings =
            person.councillors &&
            person.councillors.length > 0 &&
            person.councillors
              .map(c => c.meeting_attendances && c.meeting_attendances.length)
              .reduce((c, v) => Math.max(c, v), 0) > 0

          const personHighlight = []

          if (person.estimated_yob) {
            personHighlight.push({
              xs: 2,
              title: '年齡',
              text: `${2019 - person.estimated_yob}歲`,
            })
          }

          personHighlight.push({
            xs: 5,
            title: '相關組織',
            text: person.related_organization || '-',
          })

          personHighlight.push({
            xs: 5,
            title: '職業',
            text:
              (currentTerm && currentTerm.career) || lastElection.occupation,
          })

          const titles = []

          if (person.fc_uuid) {
            titles.push('個人立場')
            titles.push('媒體報導')
          }

          titles.push('參選紀錄')

          if (hasMeetings) titles.push('會議出席率')

          return (
            <>
              {lastElection.year === 2019 &&
                lastElection.election_type === 'ordinary' && (
                  <BreadcrumbsContainer>
                    <Breadcrumbs
                      separator={<NavigateNextIcon fontSize="small" />}
                      aria-label="breadcrumb"
                    >
                      <Typography color="textPrimary">
                        {lastElection.year}
                      </Typography>
                      <UnstyledLink
                        onClick={() => {
                          this.props.history.push(
                            getDistrictOverviewUriFromTag(
                              lastElection.constituency.district.dc_code
                            )
                          )
                        }}
                      >
                        <Typography color="textPrimary">
                          {lastElection.constituency.district.dc_name_zh}
                        </Typography>
                      </UnstyledLink>
                      <UnstyledLink
                        onClick={() => {
                          this.props.history.push(
                            getConstituencyUriFromTag(
                              lastElection.constituency.code
                            )
                          )
                        }}
                      >
                        <Typography color="textPrimary">
                          {lastElection.constituency.name_zh}（
                          {lastElection.constituency.code}）
                        </Typography>
                      </UnstyledLink>
                      <Typography color="primary" style={{ fontWeight: 600 }}>
                        {person.name_zh}
                      </Typography>
                    </Breadcrumbs>
                  </BreadcrumbsContainer>
                )}

              <CandidateHeaderContainer
                camp={getColorFromCamp(lastElection && lastElection.camp)}
              >
                {this.renderElectionStatusText(person, currentTerm)}
                <CandidateAvatorContainer>
                  <PeopleAvatar
                    dimension={'84px'}
                    borderwidth={'0'}
                    src={`${homeUrl}/static/images/avatar/${person.uuid}.jpg`}
                    imgProps={{
                      onError: e => {
                        e.target.src = `${homeUrl}/static/images/avatar/default.png`
                      },
                    }}
                  />
                </CandidateAvatorContainer>
                <Box>
                  <PersonName
                    camp={getColorFromCamp(lastElection && lastElection.camp)}
                  >
                    {person.name_en ? (
                      <>
                        <Typography
                          variant="h3"
                          style={{ marginBottom: '5px' }}
                        >
                          {person.name_zh || person.name_en}
                        </Typography>
                        <Typography
                          variant="h5"
                          style={{ marginBottom: '5px' }}
                        >
                          {person.name_en || ''}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="h3" style={{ marginBottom: '3px' }}>
                        {person.name_zh || person.name_en}
                      </Typography>
                    )}

                    {this.renderIntroText(person, currentTerm)}
                  </PersonName>
                  {this.renderFacebook(person)}
                </Box>
              </CandidateHeaderContainer>

              <PersonHighlightContainer>
                <Grid container>
                  {personHighlight.map((highlight, index) => (
                    <Grid item key={index} xs={highlight.xs} pr={1}>
                      <Typography variant="h5">{highlight.text}</Typography>
                    </Grid>
                  ))}
                </Grid>
                <Grid container>
                  {personHighlight.map((highlight, index) => (
                    <Grid item key={index} xs={highlight.xs} pr={1}>
                      <Typography variant="h6">{highlight.title}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </PersonHighlightContainer>
              <ScrollableTabs
                titles={titles}
                indicatorcolor={
                  COLORS.camp[
                    getColorFromCamp(lastElection && lastElection.camp)
                  ].background
                }
                variant="scrollable"
              >
                {person.fc_uuid && (
                  <FCPersonData
                    fcUuid={person.fc_uuid}
                    name={person.name_zh || person.name_en}
                    filterFunc={record =>
                      record.eventType !== 'MEDIA' &&
                      record.eventType !== 'OTHER'
                    }
                  />
                )}
                {person.fc_uuid && (
                  <FCPersonData
                    fcUuid={person.fc_uuid}
                    name={person.name_zh || person.name_en}
                    filterFunc={record => record.eventType === 'MEDIA'}
                  />
                )}
                <PersonElectionHistoriesContainer personId={person.id} />
                {hasMeetings && (
                  <CouncillorMeetingAttendanceContainer personId={person.id} />
                )}
              </ScrollableTabs>
            </>
          )
        }}
      </Query>
    )
  }
}

export default ProfilePage
